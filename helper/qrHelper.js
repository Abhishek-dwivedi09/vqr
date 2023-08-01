const qrcode = require('qrcode');
const base64Img = require('base64-img');
const Jimp = require('jimp');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp')
const dotenv = require('dotenv');
require('dotenv').config();
const archiver = require('archiver')

const API_KEY = process.env.API;
const ROOT_DIR = process.env.ROOT_DIR;
const watermark_path = process.env.watermark_path;


function createDirectory(x) {
  const directoryPath = path.join(ROOT_DIR, x);
  console.log(directoryPath);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const privatePath = path.join(directoryPath, 'Private');
  if (!fs.existsSync(privatePath)) {
    fs.mkdirSync(privatePath);
  }

  console.log(`Directory '${x}' created successfully!`);
  return privatePath;
}

async function resizeImage(inputPath, outputPath, size, watermarkPath) {
  try {
    await sharp(inputPath)
      .resize(size[0], size[1])
      .composite([{ input: watermarkPath, gravity: 'center' }])
      .toFile(outputPath);

    console.log(`Image resized and saved successfully: ${outputPath}`);
  } catch (error) {
    console.error(`Unable to resize or save the image: ${inputPath}`);
  }
}

// exports.generateAndProcessQR = (str_qr, sid) => {
//   return new Promise((resolve, reject) => {
//     // QR code generation using qrcode library
//     qrcode.toDataURL(str_qr, (err, dataURL) => {
//       if (err) {
//         return reject(err);
//       }

//       // Save the QR code image
//       const qrImagePath = 'C:\\Users\\dwivedi\\Desktop\\VQR\\private';

//       base64Img.img(dataURL, '', qrImagePath, (err) => {
//         if (err) {
//           return reject(err);
//         }

//         // Process the image and create a zip file
//         processImages(sid, qrImagePath)
//           .then(resolve)
//           .catch(reject);
//       });
//     });
//   });
// };

exports.generateAndProcessQR= async  (req, res) => {
  const { qr, sid, prompt, batch_size } = req.body;
  const objQR = qrcode.create(qr);

  objQR.toDataURL((err, url) => {
    if (err) {
      return res.status(500).json({ status: 'fail', message: 'Error generating QR code' });
    }

    axios
      .post(url, { headers: { 'Content-Type': 'application/json' } })
      .then((response) => {
        const privatePath = createDirectory(sid);
        const response_data = response.data;

        const imageArray = [];
        for (let i = 0; i < response_data.images.length; i++) {
          const privateName = `${sid}${i}.png`;
          const publicName = `${sid}${i}_t.png`;
          const image_path_private = path.join(privatePath, privateName);
          const image_path_public = path.join(ROOT_DIR, sid, publicName);

          const imageBuffer = Buffer.from(response_data.images[i], 'base64');
          fs.writeFileSync(image_path_private, imageBuffer);

          resizeImage(image_path_private, image_path_public, [128, 128], watermark_path);

          imageArray.push(imageBuffer);
        }

        const zipFilename = `${sid}.zip`;
        const zipPathPrivate = path.join(privatePath, zipFilename);
        const zipPathPublic = path.join(ROOT_DIR, sid, zipFilename);
        const archive = archiver('zip', { zlib: { level: 9 } });

        const zipStream = fs.createWriteStream(zipPathPrivate);
        archive.pipe(zipStream);
        for (let i = 0; i < response_data.images.length; i++) {
          const filename = `${sid}${i}.png`;
          archive.append(imageArray[i], { name: filename });
        }
        archive.finalize();

        const backImage = path.join(ROOT_DIR, watermark_path);

        const frontImageFolder = privatePath;
        const frontImageFiles = fs.readdirSync(frontImageFolder);

        frontImageFiles
          .filter((file) => !file.endsWith('.zip'))
          .forEach((frontImageFile) => {
            const frontImagePath = path.join(frontImageFolder, frontImageFile);

            loadImage(backImage).then((image) => {
              loadImage(frontImagePath).then((frontImage) => {
                const canvas = createCanvas(image.width, image.height);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0, image.width, image.height);
                ctx.drawImage(frontImage, 0, 0, image.width, image.height);

                const resultPath = path.join(frontImageFolder, `w_${frontImageFile}`);
                const out = fs.createWriteStream(resultPath);
                const stream = canvas.createJPEGStream();
                stream.pipe(out);

                out.on('finish', () => {
                  console.log(`Image with watermark saved successfully: ${resultPath}`);
                });
              });
            });
          });

        res.json({ status: 'success', message: 'QR code images generated' });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ status: 'fail', message: 'Request failed' });
      });
  });
}





// Image processing function
function processImages(sid, qrImagePath) {
  const frontImageFolder = path.join(__dirname, '../private');
  const zipFilePath = path.join(frontImageFolder, `${sid}.zip`);

  return new Promise((resolve, reject) => {
    // Image processing using Jimp
    Jimp.read(qrImagePath, (err, qrImage) => {
      if (err) {
        return reject(err);
      }

      // Apply watermark to the QR code image
      Jimp.read(watermarkPath, (err, watermark) => {
        if (err) {
          return reject(err);
        }

        qrImage.composite(watermark, 0, 0, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacityDest: 1,
          opacitySource: 0.5
        });

        // Save the processed QR code image
        const processedImagePath = path.join(frontImageFolder, `w_${sid}_qr.png`);
        qrImage.write(processedImagePath, (err) => {
          if (err) {
            return reject(err);
          }

          // Create a zip file with the processed images
          const zip = new AdmZip();
          const imageFiles = fs.readdirSync(frontImageFolder);

          for (const file of imageFiles) {
            if (!file.endsWith('.zip')) {
              const imageFilePath = path.join(frontImageFolder, file);
              zip.addLocalFile(imageFilePath);
            }
          }

          zip.writeZip(zipFilePath);

          resolve();
        });
      });
    });
  });
}

exports.getImageFilePath = (sid, filename) => {
    return new Promise((resolve, reject) => {
      const folderPath = path.join(ROOT_DIR, sid);
      const filePath = path.join(folderPath, filename);
  
      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          return reject(err);
        }
        resolve(filePath);
      });
    });
  };
