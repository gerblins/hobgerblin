import fs from "fs";
import Koa from "koa";
import http from "http";
import https from "https";
import yaml from "js-yaml";
import Router from "koa-router";
import { ListenOptions } from "net";
import { setup as storageSetup, StorageConfig } from "./storage";
import { exit } from "process";
import { ArgumentParser } from "argparse";

interface BackupConfig {
  filename: string;
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

interface Config {
  storage: StorageConfig;
  backups: {
    [key: string]: BackupConfig;
  };
  server: ServerConfig;
}

const formatDate = (date: Date): string => {
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${year}-${month}-${day}`;
};

const formatTime = (date: Date): string => {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${hours}-${minutes}-${seconds}`;
};

const parser = new ArgumentParser({
  description: "A server for saving backup files to various storage backends",
});
parser.add_argument("-c", "--config", {
  help: "Path to the configuration file",
  default: "config.yml",
  required: false,
});
const args = parser.parse_args();

const config: Config = yaml.load(fs.readFileSync(args.config).toString());

const storage = storageSetup(config.storage);
const backups = config.backups;

const router = new Router();

router.all("/backup/:id", async (ctx) => {
  if (!(ctx.params.id in backups)) {
    ctx.status = 404;
    return;
  }
  const info = backups[ctx.params.id];
  const now = new Date();
  const filename = info.filename
    .replace("{{date}}", formatDate(now))
    .replace("{{time}}", formatTime(now));

  console.info(`Saving file to ${info.storage} with name ${filename}`);

  await storage[info.storage].receiveFileStream(
    filename,
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
      console.error(
        `HTTP server failed to start with the following error`,
        err,
      );
      exit(1);
    }
    console.info(`HTTP server started on port ${config.server.http?.port}`);
  });
}

if (config.server.https) {
  const options = {
    key: fs.readFileSync(config.server.https?.options.key),
    cert: fs.readFileSync(config.server.https?.options.cert),
  };
  https
    .createServer(options, callback)
    .listen(config.server.https, (err?: Error) => {
      if (!!err) {
        console.error(
          `HTTPS server failed to start with the following error`,
          err,
        );
        exit(1);
      }
      console.info(`HTTPS server started on port ${config.server.https?.port}`);
    });
}
