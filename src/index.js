require('dotenv').config()
const express = require('express')
const stampRoutes = require( './endpoints/stamp')
const verifyRoutes = require( './endpoints/verify')
const fileRoutes = require( './endpoints/files')
const metricsRoutes = require( './endpoints/metrics')
const { initAWS } = require('./lib/aws_sevices')
const { logger } = require('./lib/logger')
const app = express()
const port = 3000 || process.env.PORT
const router = express.Router()
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload')
const { HTTP_STATUS } = require('./lib/constans')

const swaggerUi = require('swagger-ui-express'),
      swaggerDocument = require('./docs/swagger.json')

app.use(
  '/api/docs',
  swaggerUi.serve, 
  swaggerUi.setup(swaggerDocument)
);

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(fileUpload())

app.use( (req, _, done) => {
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

app.use((req, res, _) => res.status(404).json(HTTP_STATUS['404'](`${req.url} Not found`)))

app.listen(port, () => {
  console.log("Express Listening at http://localhost:" + port)
})