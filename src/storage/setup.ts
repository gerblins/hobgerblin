import { s3, filesystem } from ".";
import { StorageBackend, StorageConfig } from "./types";

export const setup = (
  config: StorageConfig,
): { [key: string]: StorageBackend } => {
  return Object.entries(config).reduce<{ [key: string]: StorageBackend }>(
    (prev, [name, config]) => {
      switch (config.backend) {
        case "s3":
          return { ...prev, [name]: s3.init(config as any) };
        case "fs":
          return { ...prev, [name]: filesystem.init(config as any) };
        default:
          return prev;
      }
    },
    {},
  );
};
