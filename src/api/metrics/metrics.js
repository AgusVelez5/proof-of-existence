const express = require('express')
const router = express.Router()
const { parse_timestream_result, timestream_query, write_ts_records } = require('../../lib/aws_sevices')
const { TS_METRICS_DATABASE, METRICS_STAMP_TABLE, METRICS_VERIFY_TABLE, METRICS_GET_PROOF_TABLE } = require('../../lib/env')
const { HTTP_STATUS } = require('../../lib/constans')
const BigNumber = require("bignumber.js")

const query_wrapper = async (Table, query) => {
  console.log(query)
  try {
    const result = await timestream_query({
      QueryString: query
    });
    return parse_timestream_result(result);
  } catch (e) {
    if (e.message.includes("Column 'file_name' does not exist")) {
      console.log(`${Table} is empty, creating empty schema...`)
      await write_ts_records(Table, 'schema_initialization', 'schema_initialization')
      
      return [];
    }
    else throw e;
  }
}

const get_stamps = async ({ bin_size, time_charts_from, time_charts_to }) => {
  return await query_wrapper(METRICS_STAMP_TABLE,
    `
      SELECT
        COUNT(file_name) AS stamps_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_STAMP_TABLE}"
      WHERE 
        file_name <> 'schema_initialization' AND
        ${time_charts_from ? `time >= ago(${time_charts_from})` : 'true'} AND 
        ${time_charts_to ? `time <= ago(${time_charts_to})` : 'true'}
      GROUP BY file_name, bin(time, ${bin_size})
      ORDER BY timestamp
    `
  )
}

const get_verifications = async ({ bin_size, time_charts_from, time_charts_to }) => {
  return await query_wrapper(METRICS_VERIFY_TABLE, 
    `
      SELECT
        COUNT(file_name) AS verifications_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_VERIFY_TABLE}"
      WHERE
        file_name <> 'schema_initialization' AND
        ${time_charts_from ? `time >= ago(${time_charts_from})` : 'true'} AND 
        ${time_charts_to ? `time <= ago(${time_charts_to})` : 'true'}
      GROUP BY bin(time, ${bin_size})
      ORDER BY timestamp
    `
  )
}

const get_proofs = async ({ bin_size, time_charts_from, time_charts_to }) => {
  return await query_wrapper(METRICS_GET_PROOF_TABLE, 
    `
      SELECT
        COUNT(file_name) AS proofs_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_GET_PROOF_TABLE}"
      WHERE
        file_name <> 'schema_initialization' AND
        ${time_charts_from ? `time >= ago(${time_charts_from})` : 'true'} AND 
        ${time_charts_to ? `time <= ago(${time_charts_to})` : 'true'}
      GROUP BY bin(time, ${bin_size})
      ORDER BY timestamp
    `
  )
}

const get_verifications_by_file = async ({ file_charts_from, file_charts_to }) => {
  return await query_wrapper(METRICS_VERIFY_TABLE, 
    `
      SELECT
        file_name,
        COUNT(file_name) AS verifications_number
      FROM "${TS_METRICS_DATABASE}"."${METRICS_VERIFY_TABLE}"
      WHERE
        file_name <> 'schema_initialization' AND
        ${file_charts_from ? `time >= ago(${file_charts_from})` : 'true'} AND
        ${file_charts_to ? `time <= ago(${file_charts_to})` : 'true'}
      GROUP BY file_name
      ORDER BY file_name
    `
  )
}

const get_proofs_by_file = async ({ file_charts_from, file_charts_to }) => {
  return await query_wrapper(METRICS_GET_PROOF_TABLE, 
    `
      SELECT
        file_name,
        COUNT(file_name) AS proofs_number
      FROM "${TS_METRICS_DATABASE}"."${METRICS_GET_PROOF_TABLE}"
      WHERE
        file_name <> 'schema_initialization' AND
        ${file_charts_from ? `time >= ago(${file_charts_from})` : 'true'} AND
        ${file_charts_to ? `time <= ago(${file_charts_to})` : 'true'}
      GROUP BY file_name
      ORDER BY file_name
    `
  )
}

const get_hours_diff = (date, start) => {
  const previousDate = new Date(new Date(parseInt(date)).toISOString().slice(0, 10)),
        nextPreviousDate = (new Date(new Date(new Date(previousDate.setDate(previousDate.getDate() + (start === 'from' ? 0 : 1)))).toISOString().slice(0, 10))).valueOf(),
        diffValue = new BigNumber((new Date()).valueOf()).minus(nextPreviousDate).integerValue(),
        finalDiff = new BigNumber(diffValue).div(36e5).integerValue().toFixed()

  if ( finalDiff === '0')
    return null

  return `${finalDiff}h`
}

const metrics = async (req, res) => {
  const params = {
    bin_size: req.query.group_by || '1d',
    time_charts_from: req.query.time_charts_from ? get_hours_diff(req.query.time_charts_from, 'from') : undefined,
    time_charts_to: req.query.time_charts_to ? get_hours_diff(req.query.time_charts_to, 'to') : undefined,
    file_charts_from: req.query.file_charts_from ? get_hours_diff(req.query.file_charts_from, 'from') : undefined,
    file_charts_to: req.query.file_charts_to ? get_hours_diff(req.query.file_charts_to, 'to') : undefined
  }

  const [ stamps, verifications, verifications_by_file, proofs, proofs_by_file ] = await Promise.all([
    get_stamps(params),
    get_verifications(params),
    get_verifications_by_file(params),
    get_proofs(params),
    get_proofs_by_file(params)
  ])

  res.status(200).send(HTTP_STATUS(200, {
    stamps, 
    verifications, 
    verifications_by_file, 
    proofs, 
    proofs_by_file
  }))
}

router.route('/metrics').get(metrics)

module.exports = router