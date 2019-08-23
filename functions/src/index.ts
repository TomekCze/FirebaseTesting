import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child-process-promise';

export const onFileChange = functions.storage.object().onFinalize(event => {
  const object = event;
  const bucket = object.bucket;
  const contentType = object.contentType;
  const filePath: string = object.name!;
  console.log('File change detected, function execution started');
  console.log(event);

  if (path.basename(filePath).startsWith('resized-')) {
    console.log('We already renamed that file');
    return;
  }

  const projectId = 'fb-cloud-functions-demo1';
  const gsc = new Storage({ projectId });

  const destBucket = gsc.bucket(bucket);
  const tmpFilePath = path.join(os.tmpdir(), path.basename(filePath));
  const metadata = { contentType: contentType };
  return destBucket
    .file(filePath)
    .download({
      destination: tmpFilePath
    })
    .then(() => {
      return spawn('convert', [tmpFilePath, '-resize', '500x500', tmpFilePath]);
    })
    .then(() => {
      return destBucket.upload(tmpFilePath, {
        destination: 'resized-' + path.basename(filePath),
        metadata: metadata
      });
    });
});

export const onFileDelete = functions.storage.object().onDelete(event => {
  console.log(event);
});
