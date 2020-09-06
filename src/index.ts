import fs from "fs";
import Koa from "koa";
import http from "http";
import https from "https";
import yaml from "js-yaml";
import { exit } from "process";
import Router from "koa-router";
import { logger } from "./logger";
import { ListenOptions } from "net";
import { ArgumentParser } from "argparse";
import { setup as storageSetup, StorageConfig } from "./storage";
import { formatDate, formatTime } from "./formatters";

interface BackupConfig {
  filename?: string;
  defaultFilename: string;
  storage: string;
}

interface ServerConfig {
  http?: ListenOptions;

  https?: {
    hostname?: string;
    port: number;
    options: {
      key: string;
      cert: string;
    };
  };
}

interface ReloadConfig {
  ssl?: boolean;
  storageAndBackups?: boolean;
}

interface Config {
  storage: StorageConfig;
  backups: {
    [key: string]: BackupConfig;
  };
  server: ServerConfig;
  reload: ReloadConfig;
}

const parser = new ArgumentParser({
  description: "A server for saving backup files to various storage backends",
});
parser.add_argument("-c", "--config", {
  help: "Path to the configuration file",
  default: "config.yml",
  required: false,
});
const args = parser.parse_args();

// TODO: validate configs
const config: Config = yaml.load(fs.readFileSync(args.config).toString());

let storage = storageSetup(config.storage);
let backups = config.backups;

const router = new Router();

router.all("/backup/:id{/:filename(.+)}?", async (ctx) => {
  if (!(ctx.params.id in backups)) {
    ctx.status = 404;
    return;
  }
  const info = backups[ctx.params.id];
  const now = new Date();
  const filename = (info.filename || info.defaultFilename || "")
    .replace("{{date}}", formatDate(now))
    .replace("{{time}}", formatTime(now));

  logger.info(`Saving file to ${info.storage} with name ${filename}`);

  await storage[info.storage].receiveFileStream(
    info.defaultFilename ? ctx.params.filename || filename : filename,
    ctx.req,
    ctx.request.length,
  );
  ctx.body = "Done";
});

const app = new Koa();

app.use(router.routes()).use(router.allowedMethods());

const callback = app.callback();

if (config.server.http) {
  http.createServer(callback).listen(config.server.http, (err?: Error) => {
    if (!!err) {
      logger.error(`HTTP server failed to start with the following error`, err);
      exit(1);
    }
    logger.info(`HTTP server started on port ${config.server.http?.port}`);
  });
}

let httpsServer: https.Server | undefined;
if (config.server.https) {
  const options = {
    key: fs.readFileSync(config.server.https?.options.key),
    cert: fs.readFileSync(config.server.https?.options.cert),
  };
  httpsServer = https
    .createServer(options, callback)
    .listen(config.server.https, (err?: Error) => {
      if (!!err) {
        logger.error(
          `HTTPS server failed to start with the following error`,
          err,
        );
        exit(1);
      }
      logger.info(`HTTPS server started on port ${config.server.https?.port}`);
    });
}

if (config.reload?.ssl && httpsServer) {
  const keyWatcher = fs.watch(config.server.https!.options.key);
  const certWatcher = fs.watch(config.server.https!.options.cert);

  // Debounce because both might fire at once
  let timeout: NodeJS.Timeout | undefined;

  const reloader = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    timeout = setTimeout(() => {
      if (!config.server.https) {
        return;
      }

      logger.info("Reloading SSL cert and key");

      httpsServer?.setSecureContext({
        key: fs.readFileSync(config.server.https?.options.key),
        cert: fs.readFileSync(config.server.https?.options.cert),
      });

      logger.info("Reloaded SSL cert and key");
    }, 1000);
  };

  keyWatcher.on("change", reloader);
  certWatcher.on("change", reloader);
}

if (config.reload?.storageAndBackups) {
  // Debounce because it seems to fire twice sometimes
  let timeout: NodeJS.Timeout | undefined;

  fs.watch(args.config).on("change", () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    timeout = setTimeout(() => {
      logger.info("Reloading storage and backup configs");

      const config: Config = yaml.load(fs.readFileSync(args.config).toString());

      storage = storageSetup(config.storage);
      backups = config.backups;

      logger.info("Reloaded storage and backup configs");
    }, 1000);
  });
}
