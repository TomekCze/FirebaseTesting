import * as functions from 'firebase-functions';
import { Storage } from '@google-cloud/storage';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child-process-promise';
const cors = require('cors')({ origin: true });
import * as Busboy from 'busboy';
const fs = require('fs');
import * as admin from 'firebase-admin';
admin.initializeApp();

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

// export const uploadFile = functions.https.onRequest(
//   (
//     req: { method: string; headers: any; rawBody: any },
//     res: {
//       status: {
//         (arg0: number): { json: (arg0: { message: string }) => void };
//         (arg0: number): { json: (arg0: { message: string }) => void };
//         (arg0: number): { json: (arg0: { error: any }) => void };
//       };
//     }
//   ) => {
//     cors(req, res, () => {
//       if (req.method !== 'POST') {
//         // tslint:disable-next-line:no-void-expression
//         return res.status(500).json({
//           message: 'Not allowed'
//         });
//       }
//       const busboy = new Busboy({ headers: req.headers });
//       const projectId = 'fb-cloud-functions-demo1';
//       const gsc = new Storage({ projectId });
//       let uploadData = { file: null, type: null };

//       busboy.on(
//         'file',
//         (
//           fieldname: any,
//           file: { pipe: (arg0: any) => void },
//           filename: any,
//           encoding: any,
//           mimetype: null
//         ) => {
//           const filepath = path.join(os.tmpdir(), filename);
//           uploadData = { file: filepath, type: mimetype };
//           file.pipe(fs.createWriteStream(filepath));
//         }
//       );

//       busboy.on('finish', () => {
//         const bucket = gsc.bucket('fb-cloud-functions-demo1.appspot.com');
//         bucket
//           .upload(uploadData.file, {
//             //uploadType: 'media',
//             metadata: {
//               metadata: {
//                 contentType: uploadData.type
//               }
//             }
//           })
//           .then(() => {
//             return res.status(200).json({
//               message: 'It worked'
//             });
//           })
//           .catch((err: any) => {
//             res.status(500).json({
//               error: err
//             });
//           });
//       });
//       busboy.end(req.rawBody);
//     });
//   }
// );

exports.uploadFile = functions.https.onRequest(
  (
    req: { method: string; headers: any; rawBody: any },
    res: {
      status: {
        (arg0: number): { json: (arg0: { message: string }) => void };
        (arg0: number): { json: (arg0: { message: string }) => void };
        (arg0: number): { json: (arg0: { error: any }) => void };
      };
    }
  ) => {
    cors(req, res, () => {
      if (req.method !== 'POST') {
        // tslint:disable-next-line: no-void-expression
        return res.status(500).json({
          message: 'Not allowed'
        });
      }
      const busboy = new Busboy({ headers: req.headers });
      const projectId = 'fb-cloud-functions-demo1';
      const gsc = new Storage({ projectId });
      let uploadData: any;

      busboy.on(
        'file',
        (
          fieldname: any,
          file: { pipe: (arg0: any) => void },
          filename: any,
          encoding: any,
          mimetype: null
        ) => {
          const filepath = path.join(os.tmpdir(), filename);
          uploadData = { file: filepath, type: mimetype };
          file.pipe(fs.createWriteStream(filepath));
        }
      );

      busboy.on('finish', () => {
        const bucket = gsc.bucket('fb-cloud-functions-demo1.appspot.com');
        bucket
          .upload(uploadData.file, {
            //uploadType: 'media',
            metadata: {
              metadata: {
                contentType: uploadData.type
              }
            }
          })
          .then(() => {
            res.status(200).json({
              message: 'It worked!'
            });
          })
          .catch((err: any) => {
            res.status(500).json({
              message: err
            });
          });
      });
      busboy.end(req.rawBody);
    });
  }
);

exports.onDataAdded = functions.database
  .ref('/message/{id}')
  .onCreate((snapshot, context) => {
    const data = snapshot.val();
    // const newData = {
    //   msg: data.msg.toUpperCase()
    // };
    const newData = data.msg.toUpperCase();
    return snapshot.ref.update({ msg: newData });
    //return snapshot.ref.child('copiedData').set(newData);
    //snapshot.ref.parent.child('copiedData').set(newData);
  });

exports.onDataAddedFS = functions.firestore
  .document('message/{id}')
  .onCreate((snapshot, context) => {
    const newValue = snapshot.data();
    const msg: string = newValue!.msg;
    const newMsg = msg.toUpperCase();

    return snapshot.ref.set({ msg: newMsg });
  });
