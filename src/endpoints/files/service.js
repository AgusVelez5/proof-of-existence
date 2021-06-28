const { download_file_from_s3, get_file_data, write_ts_records, get_all_files_data } = require('../../lib/aws_sevices')
const updateOts = require('../../lib/upgrade_ots')
const JSZip = require('jszip')
const { METRICS_GET_PROOF_TABLE } = require('../../lib/env')
const { ERRORS, HTTP_STATUS } = require('../../lib/constans')
const { logger } = require('../../lib/logger')

const FileDataService = async _ => {
  try {
    return HTTP_STATUS['200'](await get_all_files_data())
  } catch (err) {
    logger.error(err)
    return HTTP_STATUS['500'](ERRORS['SERVER_ERROR'])
  }
}

const ProofService = async hashes => {
  try {
    const zip = new JSZip()
    for (const hash of hashes) {

      let [file, ots] = await Promise.all([download_file_from_s3(hash), download_file_from_s3(`${hash}.ots`)])
      if (!file || !ots)
        return HTTP_STATUS['404'](ERRORS['UNKNOWN_HASH'](hash))

      ots = await updateOts(hash, ots)
      const file_data = await get_file_data(hash)  
      await write_ts_records(METRICS_GET_PROOF_TABLE, file_data.name, hash, [])

      zip.file(file_data.name, file, { binary : true } )
      zip.file(`${file_data.name}.ots`, ots, { binary : true } )
    }

    const result = await zip.generateAsync( { type : "nodebuffer", compression: 'DEFLATE' } )
    return HTTP_STATUS['200'](result)
  } catch (err) {
    console.log(err)
    logger.error(err)
    return HTTP_STATUS['500'](ERRORS['SERVER_ERROR'])
  }
}


module.exports = {
  FileDataService,
  ProofService
}