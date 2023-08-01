const constants = require('../utils/constants');

exports.apiAuth = async(req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== constants.API_KEY) {
    const response = {
      status: 'fail',
      message: 'Invalid API key',
    };
    return res.status(401).json(response);
  }
  next();
}

