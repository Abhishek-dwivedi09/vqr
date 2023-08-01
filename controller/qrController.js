const qrHelper = require("../helper/qrHelper");
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const archiver = require('archiver');
const QRModel = require('../model/qrModel')
const sharp = require('sharp');
const dotenv = require('dotenv');
const qrcode = require('qrcode');
dotenv.config();
  
const API_KEY = process.env.API_KEY



exports.generate_qr =async (req, res) => {
  const api_key = req.headers['x-api-key'];

  // Replace 'YOUR_API_KEY' with the actual API key you expect
  if (api_key !== API_KEY) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid API key'
    });
  }

  try {
    const result = await QRModel.generateQR(req.body);

    if (result.status === 'success') {
      return res.json({
        status: 'success',
        message: result.message
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};



exports.serve_file= async (req, res) => {
  const { sid, filename } = req.params;

  if (sid && filename) {
    imageHelper.getImageFilePath(sid, filename)
      .then((file_path) => {
        res.sendFile(file_path);
      })
      .catch((err) => {
        console.error('Error serving image:', err);
        res.status(404).send('File not found');
      });
  } else {
    res.status(400).send('Invalid sid or filename');
  }
};

exports.deleteDirectory = async (req, res) => {
  const { sid } = req.params;
  const api_key = req.headers['x-api-key'];

  if (api_key !== API_KEY) {
    return res.status(401).json({ status: 'fail', message: 'Invalid API key' });
  }

  try {
    const directoryPath = path.join(ROOT_DIR, sid);
    const directoryExists = await fs.access(directoryPath, fs.constants.F_OK);

    if (directoryExists) {
      await fs.rmdir(directoryPath, { recursive: true });
      return res.json({ status: 'success', message: 'Directory successfully deleted', sid });
    } else {
      return res.status(404).json({ status: 'fail', message: `Directory '${sid}' does not exist.`, sid });
    }
  } catch (err) {
    console.error('Error deleting directory:', err);
    return res.status(500).json({ status: 'fail', message: 'Error occurred while deleting the directory.', sid });
  }
};

exports.state_change = async(req,res)=>{
  const api_key = req.headers['x-api-key'];

  if (api_key !== API_KEY) {
    return res.status(401).json({ status: 'fail', message: 'Invalid API key' });
  }

  const sid = req.query.sid;
  const image_path_private = path.join(ROOT_DIR, sid, 'Private');
  const image_path_public = path.join(ROOT_DIR, sid);

  try {
    const privateFiles = await fs.readdir(image_path_private);

    for (const file_name of privateFiles) {
      if (file_name.startsWith(sid)) {
        const source_path = path.join(image_path_private, file_name);
        const destination_path = path.join(image_path_public, file_name);

        await fs.copyFile(source_path, destination_path);
      }
    }

    return res.json({ status: 'success', message: 'Files without watermark transferred from Private to accessible directory' });
  } catch (err) {
    console.error('Error transferring files:', err);
    return res.status(500).json({ status: 'fail', message: 'Error occurred while transferring files', sid });
  }
    
}

exports.state_change_w = async(req,res)=>{
  const api_key = req.headers['x-api-key'];

  if (api_key !== API_KEY) {
    return res.status(401).json({ status: 'fail', message: 'Invalid API key' });
  }

  const sid = req.query.sid;
  const image_path_private = path.join(ROOT_DIR, sid, 'Private');
  const image_path_public = path.join(ROOT_DIR, sid);

  try {
    const privateFiles = await fs.readdir(image_path_private);

    for (const file_name of privateFiles) {
      if (file_name.startsWith('w')) {
        const source_path = path.join(image_path_private, file_name);
        const destination_path = path.join(image_path_public, file_name);

        await fs.copyFile(source_path, destination_path);
      }
    }

    return res.json({ status: 'success', message: 'Files with watermark transferred from Private to accessible directory' });
  } catch (err) {
    console.error('Error transferring files:', err);
    return res.status(500).json({ status: 'fail', message: 'Error occurred while transferring files', sid });
  }
    
}