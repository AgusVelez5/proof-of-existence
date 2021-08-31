const OpenTimestamps = require('opentimestamps')
const { download_file_from_s3, get_file_data, write_ts_records } = require('../../lib/aws_sevices')
const updateOts = require('../../lib/upgrade_ots')
const { METRICS_VERIFY_TABLE } = require('../../lib/env')
const { logger } = require('../../lib/logger')
const { ERRORS, HTTP_STATUS } = require('../../lib/constans')
const { hexToBytes } = require('../../lib/utils')

module.exports = async hashes => {
  try {
    const data = []
    for (const hash of hashes) {
      let ots = await download_file_from_s3(`${hash}.ots`)
      if (!ots) {
        data.push(ERRORS['UNKNOWN_HASH'](hash))
        continue
      }

      ots = await updateOts(hash, ots)
      const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hexToBytes(hash)),
            detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(ots),
            result = await OpenTimestamps.verify(detachedOts, detached)
      if (Object.entries(result).length === 0 && result.constructor === Object) {
        data.push(ERRORS['PENDING_STAMP'](hash))
        continue
      }

      const file_data = await get_file_data(hash)
      await write_ts_records(METRICS_VERIFY_TABLE, file_data.name, hash, [])
      data.push({
        file_name: file_data.name,
        hash: hash,
        proof: result.bitcoin
      })
    }

    return HTTP_STATUS['200'](data)
  } catch (err) {
    logger.error(err)
    return HTTP_STATUS['500'](ERRORS['SERVER_ERROR'])
  }
}