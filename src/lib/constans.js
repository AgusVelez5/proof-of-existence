const RESPONSES = {
  ALREADY_STAMPED_FILE: hash => `The received file is already stamped. It hash is ${hash}.`,
  STAMPED: hash => `Stamping file, hash: ${hash}.`
}

const ERRORS = {
  HASHES_EXCEEDED: "The maximum number of hashes is 10",
  HASHES_FIELD: "The 'hashes' field is required",
  PENDING_STAMP: hash => `The Bitcoin transaction is unconfirmed. The attestation is still pending. Once the transaction confirms, you will can verify your file (${hash})`,
  INVALID_HASH:  hash => `The received hash (${hash}) is invalid. It must contain only alphanumeric values`,
  UNKNOWN_HASH: hash => `The received hash (${hash}) is unknown. Stamp file before checking it on verify path`,
  SERVER_ERROR: "Server error"
}

const HTTP_STATUS = {
  "200": data => ({ status: 200, data: data }),
  "400": data => ({ status: 400, data: data }),
  "404": data => ({ status: 404, data: data }),
  "500": data => ({ status: 500, data: data })
}

module.exports = {
  RESPONSES,
  ERRORS,
  HTTP_STATUS
}