const OpenTimestamps = require('opentimestamps')
const { upload_file_to_s3 } = require('./aws_sevices')

module.exports = async (file_hash, ots) => {
  const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(ots)
  
  return await OpenTimestamps.upgrade(detachedOts).then(async changed => {
    if (changed) {
      const upgradedFileOts = detachedOts.serializeToBytes(),
            ots_buffer = Buffer.from(upgradedFileOts)
      await upload_file_to_s3(`${file_hash}.ots`, ots_buffer)
      return ots_buffer
    }
    return ots
  })
}