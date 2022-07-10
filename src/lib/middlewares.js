const { ERRORS, HTTP_STATUS } = require('./constans') 
const { logger } = require('./logger')

const split_hashes = (req, res, next) => {
  try {
    if (!Object.keys(req.query).includes('hashes'))
      return res.status(400).send(HTTP_STATUS(400, ERRORS['HASHES_FIELD']))  
    
    req.query.hashes = req.query.hashes.split(',')
    
    if (req.query.hashes.length > 10)
      return res.status(400).send(HTTP_STATUS(400, ERRORS['HASHES_EXCEEDED']))  
    next()
  } catch (err) {
    logger.error(err)
    return res.status(500).send(HTTP_STATUS(500, ERRORS['SERVER_ERROR']))
  }
}

module.exports = {
  split_hashes
}