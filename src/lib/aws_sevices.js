const fs = require("fs")
const AWS = require('aws-sdk')
const moment = require("moment")
const { TS_METRICS_DATABASE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, TIMESTREAM_REGION, S3_BUCKET_NAME, DYNAMO_TABLE } = require('./env')

const initAWS = _ => {
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
  })

  global.db = new AWS.DynamoDB.DocumentClient()
  global.s3 = new AWS.S3()
  global.ts_query = new AWS.TimestreamQuery({ region: TIMESTREAM_REGION });
  global.ts_write = new AWS.TimestreamWrite({ region: TIMESTREAM_REGION });
}

const save_file_data = async (hash, name, ts) => {
  const params = {
    TableName: DYNAMO_TABLE,
    Item: {
      "hash": hash,
      "name": name,
      "stamp_timestamp": ts
    }
  }
  await global.db.put(params).promise()
}

const get_file_data = async hash => {
  const params = {
    TableName: DYNAMO_TABLE,
    Key: {
        "hash": hash
    }
  }
  return (await global.db.get(params).promise()).Item
} 

const get_all_files_data = async _ => {
  const params = {
    TableName: DYNAMO_TABLE
  }
  return (await global.db.scan(params).promise()).Items
} 

const write_ts_records = async (table, file_name, file_hash, records = []) => {
  await global.ts_write.writeRecords({
    DatabaseName: TS_METRICS_DATABASE,
    TableName: table,
    CommonAttributes: {
      Time: new Date().valueOf().toString(),
      Dimensions: [
        { Name: 'file_name', Value: file_name, DimensionValueType: 'VARCHAR' }
      ]
    },
    Records: [ 
      ...records,
      { MeasureName: 'file_hash', MeasureValue: file_hash, MeasureValueType: 'VARCHAR' }
    ],
  }).promise()
}

const upload_file_to_s3 = async (file_name, data) => {
  const params = {
      Bucket: S3_BUCKET_NAME, 
      Key: file_name, 
      Body: data 
  }
  await global.s3.putObject(params).promise()
}

const delete_file_from_s3 = async file_name => {
  const params = {
      Bucket: S3_BUCKET_NAME, 
      Key: file_name
  }
  await global.s3.deleteObject(params).promise()
}

const download_file_from_s3 = async file_name => {
  try {
    const params = {
      Bucket: S3_BUCKET_NAME, 
      Key: file_name
    }
    return (await global.s3.getObject(params).promise()).Body
  } catch (err) {
    if (err.code === 'NoSuchKey')
      return null
    throw err
  }
}

const parse_timestream_result = result => {
  const mapped_result = []
  for (const row of result.Rows) {
    const mapped_row = {}
    row.Data.forEach((d, i) => { mapped_row[result.ColumnInfo[i].Name] = d.NullValue ? null : d.ScalarValue })
    mapped_result.push(mapped_row)
  }
  return mapped_result
}

const time_range_to_date = (time_range, bin_size) => {
  const UNITS = {
    's': 'seconds',
    'm': 'minutes',
    'h': 'hours',
    'd': 'days',
  }

  const amount = time_range.slice(0, time_range.length - 1)
  const unit = UNITS[time_range.slice(time_range.length - 1)]
  const bin_amount = bin_size.slice(0, bin_size.length - 1)
  const bin_unit = UNITS[bin_size.slice(bin_size.length - 1)]
  
  return moment.utc().subtract(bin_amount, bin_unit).subtract(amount, unit)
}

const timestream_query = async config => {
  let result

  while (true) {
    const newResult = await global.ts_query.query(config).promise()
    
    if (!result) result = newResult
    else result.Rows = [...result.Rows, ...newResult.Rows]

    if (!newResult.NextToken)
      break
      
    config.NextToken = newResult.NextToken
  }

  return result
}

module.exports = {
  initAWS,
  save_file_data,
  get_file_data,
  get_all_files_data,
  write_ts_records,
  upload_file_to_s3,
  download_file_from_s3,
  delete_file_from_s3,
  parse_timestream_result,
  time_range_to_date,
  timestream_query
}