const express = require('express');
const router = express.Router()
const controll = require('../controller/qrController')

router.post('/generate_qr',controll.generate_qr);
router.get('/:sid/:filename>',controll.serve_file)
router.delete('/:sid', controll.deleteDirectory)
router.get('/publishFull', controll.state_change)
router.get('/publishFull-with-watermark', controll.state_change_w)

module.exports = router