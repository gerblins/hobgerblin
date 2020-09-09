# Hobgerblin

Hobgerblin is a server for easing automated backups across multiple server.

## Config

Configs are specified in YAML. There are 3 primary components to any config: `storage`, `backups`, and `server`.

### Keys

#### storage

The `storage` config contains all the possible storage backends that can be backed up to.

#### backups

The `backups` config contains all the information required for a backup including the file name and storage backend. The `storage` key should correspond to a `storage` config. You can either specify `filename` or `defaultFilename`. `defaultFilename` allows you to specify the filename when you POST the file to the server.

#### server

The `server` config has the configuration for the HTTP/HTTPS servers

#### Example

```yaml
storage:
  test-s3:
    backend: "s3"
    config:
      endpoint: "s3.us-west-001.backblazeb2.com"
      credentials:
        accessKeyId: "accessKeyId"
        secretAccessKey: "secretAccessKey"
    bucket: "bucket-name"
  test-fs:
    backend: "fs"
    baseDir: "/tmp"

backups:
  tests3:
    filename: "test_{{date}}_{{time}}.jpg"
    storage: "test-s3"
  testfs:
    defaultFilename: "test_{{date}}_{{time}}.jpg"
    storage: "test-fs"

server:
  http:
    port: 5000

  https:
    port: 8443
    options:
      key: ssl/key.pem
      cert: ssl/cert.pem
```

## Sending files

To backup a file simply POST a file to `http(s)://{{server_name}}/backup/{{key}}` or `http(s)://{{server_name}}/backup/{{key}}/{{filename}}` if you've set a `defaultFilename` for this backup. The key is the key of the `backups` config e.g. `testfs` would be `http://localhost:5000/backup/testfs/filename.tar`.

### Example script

```sh
#!/bin/sh
curl -X POST --data-binary @backup.tar https://localhost:8443/backup/testfs/backup.tar
```
