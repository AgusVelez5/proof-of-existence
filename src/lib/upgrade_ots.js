const { OTS_UPDATE_DELAY_MS } = require('./env') 
const OpenTimestamps = require('opentimestamps')
const { initAWS, upload_file_to_s3, get_all_files_data, download_file_from_s3, update_file_data } = require('./aws_sevices')
const sleep = ms => new Promise(r => setTimeout(r, ms))

const m = async () => {
  initAWS()
  while (true) {
    const files = await get_all_files_data(),
          pending_stamp_files = files.filter(f => f.stamped === false)

        console.log('files', files)
        console.log('pending_stamp_files', pending_stamp_files)
        console.log('------')

    for (const file of pending_stamp_files) {
      const ots = await download_file_from_s3(`${file.hash}.ots`)
      const detachedOts = OpenTimestamps.DetachedTimestampFile.deserialize(ots)
      
      await OpenTimestamps.upgrade(detachedOts).then(async changed => {
        if (changed) {
          const upgradedFileOts = detachedOts.serializeToBytes(),
                ots_buffer = Buffer.from(upgradedFileOts)

          await Promise.all([
            update_file_data(file.hash, file.name, file.stamp_timestamp, true),
            upload_file_to_s3(`${file.hash}.ots`, ots_buffer)
          ])
        }
      })
    }
    await sleep(OTS_UPDATE_DELAY_MS)
  }
}

m()