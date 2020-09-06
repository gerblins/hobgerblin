import fs from "fs";
import { S3 } from "aws-sdk";
import { IncomingMessage } from "http";
import { StorageBackend, StorageBackendConfig } from "../types";

export interface S3Config extends StorageBackendConfig {
  backend: "s3";
  config: {
    endpoint: string;
    credentials: { accessKeyId: string; secretAccessKey: string };
  };
  bucket: string;
}

export function init(config: S3Config): StorageBackend {
  const s3 = new S3(config.config);

  const receiveFileStream = async (
    fileName: string,
    stream: IncomingMessage,
    length?: number,
  ) => {
    await s3
      .upload({
        Bucket: config.bucket,
        Key: fileName,
        Body: stream,
        ContentLength: length,
      })
      .promise();
  };

  return { receiveFileStream };
}
