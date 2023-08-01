// imageUtils.js
// This file contains utility functions used by qrModel.js

const fs = require('fs');
const path = require('path');
const jimp = require('jimp');

function createDirectory(x) {
  const directoryPath = path.join(__dirname, `../temp/${x}`);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const privatePath = path.join(directoryPath, 'Private');
  if (!fs.existsSync(privatePath)) {
    fs.mkdirSync(privatePath, { recursive: true });
  }

  return privatePath;
}

async function resizeImage(inputPath, outputPath, size) {
  try {
    const image = await jimp.read(inputPath);
    const resizedImage = image.resize(size.width, size.height);

    const watermarkPath = 'YOUR_WATERMARK_PATH'; // Replace with your actual watermark path
    const watermark = await jimp.read(watermarkPath);

    const watermarkSize = { width: resizedImage.bitmap.width / 4, height: resizedImage.bitmap.height / 4 };
    const watermarkResized = watermark.resize(watermarkSize.width, watermarkSize.height);

    const watermarkPosition = {
      x: (resizedImage.bitmap.width - watermarkResized.bitmap.width) / 2,
      y: (resizedImage.bitmap.height - watermarkResized.bitmap.height) / 2,
    };

    resizedImage.composite(watermarkResized, watermarkPosition.x, watermarkPosition.y);

    await resizedImage.writeAsync(outputPath);
    console.log(`Image resized and saved successfully: ${outputPath}`);
  } catch (error) {
    console.error(`Unable to resize or save the image: ${inputPath}`, error);
  }
}

module.exports = { createDirectory, resizeImage };
