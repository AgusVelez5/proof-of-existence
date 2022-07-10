const sha256 = require('js-sha256')
const express = require('express')
const stampService = require('./service')
const router = express.Router()
const { ERRORS, HTTP_STATUS } = require('../../lib/constans')
const multer  = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage, limits: { fieldSize: 25 * 1024 * 1024 } })

const stamp = async (req, res) => {

  if (!req.files && !req.body.file)
    return res.status(404).send(HTTP_STATUS(400, ERRORS.MISSING_FILE))

  const file = req.body.file,
        hash = sha256.sha256(Buffer.from(file.split(',')[1], 'base64'))

  const result = await stampService(req.query.name, hash, file)
  res.status(200).send(result)
}

router.route('/stamp').post(upload.any(), stamp)

module.exports = router