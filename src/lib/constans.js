const RESPONSES = {
  ALREADY_STAMPED_FILE: hash => `The received file is already stamped. It hash is ${hash}.`,
  STAMPED: hash => `Stamping file, hash: ${hash}.`
}

const ERRORS = {
  HASHES_EXCEEDED: "The maximum number of hashes is 10",
  HASHES_FIELD: "The 'hashes' field is required",
  MISSING_FILE: "File not found",
  PENDING_STAMP: hash => `The Bitcoin transaction is unconfirmed. The attestation is still pending. Once the transaction confirms, you will can verify your file (${hash})`,
  INVALID_HASH:  hash => `The received hash (${hash}) is invalid. It must contain only alphanumeric values`,
  UNKNOWN_HASH: hash => `The received hash (${hash}) is unknown. Stamp file before checking it on verify path`,
  SERVER_ERROR: "Server error"
}

const HTTP_STATUS = (status, data) => ({ status: status, data: data })

module.exports = {
  RESPONSES,
  ERRORS,
  HTTP_STATUS
}