const OpenTimestamps = require('opentimestamps')
const { hexToBytes } = require("../../lib/utils")
const { upload_file_to_s3, download_file_from_s3, write_ts_records, save_file_data } = require('../../lib/aws_sevices')
const { METRICS_STAMP_TABLE } = require('../../lib/env')
const { RESPONSES, ERRORS, HTTP_STATUS } = require('../../lib/constans')
const { logger } = require('../../lib/logger')

module.exports = async (file_name, file_hash, file_data) =>  {
  try {
    if (await download_file_from_s3(file_hash))
      return HTTP_STATUS(400, RESPONSES['ALREADY_STAMPED_FILE'](file_hash))

    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hexToBytes(file_hash))
    await OpenTimestamps.stamp(detached)

    const ots_file = detached.serializeToBytes(),
          ots_buffer = Buffer.from(ots_file),
          file_buffer = Buffer.from(file_data.split(',')[1], 'base64')

    await Promise.all([
      upload_file_to_s3(file_hash, file_buffer/* , true, type */),
      upload_file_to_s3(`${file_hash}.ots`, ots_buffer),
      write_ts_records(METRICS_STAMP_TABLE, file_name, file_hash),
      save_file_data(file_hash, file_name, (new Date()).toISOString())
    ])

    return HTTP_STATUS(200, RESPONSES['STAMPED'](file_hash))
  } catch (err) {
    logger.error(err)
    return HTTP_STATUS(500, ERRORS['SERVER_ERROR'])
  }
}
