import { IncomingMessage } from "http";

export interface StorageBackend {
  receiveFileStream: (
    fileName: string,
    stream: IncomingMessage,
    length?: number,
  ) => Promise<void>;
}

export interface StorageBackendConfig {
  backend: "fs" | "s3";
}

export type StorageConfig = { [key: string]: StorageBackendConfig };
