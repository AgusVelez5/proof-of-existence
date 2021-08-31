const { validator } = require('../../lib/validator')
const express = require('express')
const { FileDataService, ProofService } = require('./service')
const { HTTP_STATUS } = require('../../lib/constans')
const { split_hashes } = require('../../lib/middlewares')
const stream = require('stream')
const router = express.Router()

const getFileData = async (req, res) => {
  const result = await FileDataService()
  res.status(result.status).send(result)
}

const getProof = async (req, res) => {
  if (typeof validator('hashes', req.query) === String)
    return res.status(400).send(HTTP_STATUS["400"](validator('hash', req.query)))

  const result = await ProofService(req.query.hashes)

  if (result.status === 200) {
    const readStream = new stream.PassThrough(),
        buf = Buffer.from(result.data)

    readStream.end(buf)
    res.set('Content-disposition', 'attachment; filename=proof_files.zip');
    res.set('Content-Type', 'text/plain');
    readStream.pipe(res)
    return
  }
  res.status(result.status).send(result)
}

router.route('/file_data').get(getFileData)
router.route('/proof').get(split_hashes, getProof)

module.exports = router