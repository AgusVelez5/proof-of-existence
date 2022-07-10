const { validator } = require('../../lib/validator')
const express = require('express')
const verifyService = require('./service')
const { HTTP_STATUS } = require('../../lib/constans')
const { split_hashes } = require('../../lib/middlewares')
const router = express.Router()

const verify = async (req, res) => {

  if (typeof validator('hashes', req.query) === String)
    return res.status(400).send(HTTP_STATUS(400, validator('hashes', req.query)))

  const result = await verifyService(req.query.hashes)
  res.status(result.status).send(result)
}

router.route('/verify').get(split_hashes, verify)

module.exports = router