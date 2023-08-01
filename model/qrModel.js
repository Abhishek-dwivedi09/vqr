

const qrcode = require('qrcode');
const base64Img = require('base64-img');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');
const { createDirectory, resizeImage } = require('../utils/imageUtils');

class QRModel {
  static async generateQR(data) {
    const { qr, sid, prompt, batch_size } = data;

    const obj_qr = qrcode.create(qr, {
      version: 1,
      errorCorrectionLevel: 'L',
      margin: 4,
    });

    try {
      const qrImgPath = path.join(__dirname, `../temp/${sid}_qr.png`);
      await obj_qr.toFile(qrImgPath);

      const images = [];
      for (let i = 0; i < batch_size; i++) {
        images.push(base64Img.base64Sync(qrImgPath));
      }

      const options = {
        method: 'POST',
        uri: 'YOUR_API_ENDPOINT', // Replace with your actual API endpoint
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY', // Replace with your actual API key
        },
        body: {
          images: images,
        },
        json: true,
      };

      const response = await request(options);

      if (response && response.status_code === 200) {
        const privatePath = createDirectory(sid);

        for (let i = 0; i < response.images.length; i++) {
          const privateName = `${sid}${i}.png`;
          const publicName = `${sid}${i}_t.png`;
          const imageBase64Data = response.images[i];
          const imageFilePathPrivate = path.join(privatePath, privateName);
          const imageFilePathPublic = path.join(__dirname, `../public/${sid}`, publicName);

          fs.writeFileSync(imageFilePathPrivate, imageBase64Data, 'base64');

          resizeImage(imageFilePathPrivate, imageFilePathPublic, { width: 128, height: 128 });
        }

        const zipFileName = `${sid}.zip`;
        const zipFilePathPrivate = path.join(privatePath, zipFileName);
        const zipFilePathPublic = path.join(__dirname, `../public/${sid}`, zipFileName);

        const zip = new require('node-zip')();
        for (let i = 0; i < response.images.length; i++) {
          zip.file(`${sid}${i}.png`, response.images[i], { base64: true });
        }

        const data = zip.generate({ base64: false, compression: 'DEFLATE' });
        fs.writeFileSync(zipFilePathPrivate, data, 'binary');

        const watermarkPath = 'YOUR_WATERMARK_PATH'; // Replace with your actual watermark path
        const backImage = require('jimp').read(watermarkPath);

        const frontImageFolder = privatePath;
        const frontImageFiles = fs.readdirSync(frontImageFolder);

        for (const frontImageFile of frontImageFiles) {
          if (frontImageFile.endsWith('.zip')) {
            continue;
          }

          const frontImagePath = path.join(frontImageFolder, frontImageFile);
          const frontImage = await require('jimp').read(frontImagePath);

          const result = new require('jimp')(backImage.bitmap.width, backImage.bitmap.height);

          result.composite(backImage, 0, 0);
          result.composite(frontImage, 0, 0);

          const resultPath = path.join(frontImageFolder, `w_${frontImageFile}`);
          await result.writeAsync(resultPath);
        }

        return { status: 'success', message: 'QR code images generated' };
      } else {
        return { status: 'fail', message: 'Request failed' };
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      return { status: 'error', message: 'Internal server error' };
    }
  }
}

module.exports = QRModel;
