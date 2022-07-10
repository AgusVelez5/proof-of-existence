require('dotenv').config()
const express = require('express')
const stampRoutes = require( './api/stamp')
const verifyRoutes = require( './api/verify')
const fileRoutes = require( './api/files')
const metricsRoutes = require( './api/metrics')
const { initAWS } = require('./lib/aws_sevices')
const { logger } = require('./lib/logger')
const app = express()
const port = process.env.PORT || 3000 
const router = express.Router()
const bodyParser = require('body-parser')
const { HTTP_STATUS } = require('./lib/constans')
const cors = require('cors')
const path = require('path')
const { fork } = require('child_process')
const child = fork(path.resolve(__dirname, 'lib', 'upgrade_ots.js'))

const swaggerUi = require('swagger-ui-express'),
      swaggerDocument = require('./docs/swagger.json')

app.use(cors())

app.use(
  '/api/docs',
  swaggerUi.serve, 
  swaggerUi.setup(swaggerDocument)
);

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, _, done) => {
  logger.info(`path: ${req.originalUrl}`)
  logger.info(JSON.stringify(req.body))
  done()
})

initAWS()

router.use('/api', stampRoutes)
router.use('/api', verifyRoutes)
router.use('/api', fileRoutes)
router.use('/api', metricsRoutes)

app.use(router)

app.use((req, res, _) => res.status(404).json(HTTP_STATUS(404, `${req.url} Not found`)))

app.listen(port, () => {
  console.log("Express Listening at http://localhost:" + port)
})