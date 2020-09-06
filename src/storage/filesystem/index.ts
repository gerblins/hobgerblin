import fs from "fs";
import path from "path";
import { IncomingMessage } from "http";
import { StorageBackend, StorageBackendConfig } from "../types";

export interface FSBackendConfig extends StorageBackendConfig {
  baseDir: string;
}

export const init = ({ baseDir }: FSBackendConfig): StorageBackend => {
  const receiveFileStream = (
    fileName: string,
    stream: IncomingMessage,
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      const file = await fs.createWriteStream(path.join(baseDir, fileName));
      stream.pipe(file);
      stream.on("end", () => {
        file.close();
        resolve();
      });
      stream.on("error", (error) => {
        reject(error);
      });
    });
  };

  return { receiveFileStream };
};
