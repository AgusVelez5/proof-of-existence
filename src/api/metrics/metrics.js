const express = require('express')
const router = express.Router()
const { parse_timestream_result, timestream_query } = require('../../lib/aws_sevices')
const { TS_METRICS_DATABASE, METRICS_STAMP_TABLE, METRICS_VERIFY_TABLE, METRICS_GET_PROOF_TABLE } = require('../../lib/env')

const get_stamps = async ({ bin_size, time_range }) => {
  const result = await timestream_query({
    QueryString: `
      SELECT
        COUNT(file_name) AS stamps_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_STAMP_TABLE}"
      WHERE 
        ${time_range ? `time >= ago(${time_range})` : 'true'}
      GROUP BY file_name, bin(time, ${bin_size})
      ORDER BY timestamp
    `
  });

  return parse_timestream_result(result);
}

const get_verifications = async ({ bin_size, time_range }) => {
  const result = await timestream_query({
    QueryString: `
      SELECT
        COUNT(file_name) AS verifications_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_VERIFY_TABLE}"
      WHERE 
        ${time_range ? `time >= ago(${time_range})` : 'true'}
      GROUP BY bin(time, ${bin_size})
      ORDER BY timestamp
    `
  });

  return parse_timestream_result(result);
}

const get_verifications_by_file = async ({ time_range }) => {
  const result = await timestream_query({
    QueryString: `
      SELECT
        file_name,
        COUNT(file_name) AS verifications_number
      FROM "${TS_METRICS_DATABASE}"."${METRICS_VERIFY_TABLE}"
      WHERE 
        ${time_range ? `time >= ago(${time_range})` : 'true'}
      GROUP BY file_name
    `
  });

  return parse_timestream_result(result);
}

const get_proofs = async ({ bin_size, time_range }) => {
  const result = await timestream_query({
    QueryString: `
      SELECT
        COUNT(file_name) AS proofs_number,
        CONCAT(to_iso8601(bin(time, ${bin_size})), 'Z') as timestamp
      FROM "${TS_METRICS_DATABASE}"."${METRICS_GET_PROOF_TABLE}"
      WHERE 
        ${time_range ? `time >= ago(${time_range})` : 'true'}
      GROUP BY bin(time, ${bin_size})
      ORDER BY timestamp
    `
  });

  return parse_timestream_result(result);
}

const get_proofs_by_file = async ({ time_range }) => {
  const result = await timestream_query({
    QueryString: `
      SELECT
        file_name,
        COUNT(file_name) AS proofs_number
      FROM "${TS_METRICS_DATABASE}"."${METRICS_GET_PROOF_TABLE}"
      WHERE 
        ${time_range ? `time >= ago(${time_range})` : 'true'}
      GROUP BY file_name
    `
  });

  return parse_timestream_result(result);
}

const metrics = async (req, res) => {
  const params = {
    bin_size: req.query.group_by || '1h',
    time_range: req.query.time_range
  }

  const [ stamps, verifications, verifications_by_file, proofs, proofs_by_file ] = await Promise.all([
    get_stamps(params),
    get_verifications(params),
    get_verifications_by_file(params),
    get_proofs(params),
    get_proofs_by_file(params)
  ])

  res.status(200).send({
    stamps, 
    verifications, 
    verifications_by_file, 
    proofs, 
    proofs_by_file
  })
}

router.route('/metrics').get(metrics)

module.exports = router