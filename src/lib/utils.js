
const sleep = ms => new Promise(r => setTimeout(r, ms))

const retryablePromise = (promise_fn, max_retries = 3, tries = 0) => {
  return promise_fn()
  .catch(e => {
    tries++
    console.log(e)
    if (tries <= max_retries) {
      console.log('Retryable promise failed, retrying', tries)
      return retryablePromise(promise_fn, max_retries, tries)
    }
    else {
      console.log('Retryable promise failed, out of retries')
      throw(e)
    }
  })
}

const timeoutablePromise = (promise, ms_timeout = 60000) => {
  return new Promise((resolve, reject) => {
    const to = setTimeout(_ => reject('Promise timed out'), ms_timeout)
    promise.then(result => {
      clearTimeout(to)
      resolve(result)
    }).catch(e => {
      clearTimeout(to)
      reject(e)
    })
  })
}

const hexToBytes = hex => {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16))
  return bytes
}

const log = (...args) => console.log(`${new Date().toISOString()} -`, ...args)


module.exports = {
  sleep,
  retryablePromise,
  timeoutablePromise,
  hexToBytes,
  log
}


