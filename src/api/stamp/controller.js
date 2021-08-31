const sha256 = require('js-sha256')
const express = require('express')
const stampService = require('./service')
const router = express.Router()

const stamp = async (req, res) => {
  const file = req.files.file,
        hash = sha256.sha256(file.data)

  const result = await stampService(file.name, hash, file.data)
  res.status(result.status).send(result)
}

router.route('/stamp').post(stamp)

module.exports = router