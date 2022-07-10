const Joi = require('joi')

const schemas = {
  hash: Joi.object({ hash: Joi.string().alphanum().required() }),
  hashes: Joi.object({ hashes: Joi.array().items(Joi.string().alphanum().required()) })
}

const validator = (schemaName, data) => {
  const { value, error } = schemas[schemaName].validate(data)
  if (error) return error 
  
  return value
}

module.exports = {
  validator
}