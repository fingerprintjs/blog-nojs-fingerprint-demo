import path from 'path'
import express from 'express'
import * as pg from 'pg'
import { Storage } from './common_types'
import PostgresStorage from './storages/postgres_storage'
import renderMainPage from './endpoints/main_page'
import receiveSignal from './endpoints/receive_signal'
import receiveHeaders from './endpoints/receive_headers'
import renderWaitResultFrame from './endpoints/wait_result_frame'
import renderResultFrame from './endpoints/result_frame'
import renderResultPage from './endpoints/result_page'
import { catchErrorForExpress, makeExpressHeaderGetter, responseToExpress } from './utils'

export default async function initApp(): Promise<express.Express> {
  const storage = createStorage()
  const app = express()

  app.get('/', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      responseToExpress(
        res,
        await renderMainPage(
          storage,
          req.ip,
          req.header('User-Agent') || '',
          (visitId, signalKey, value) =>
            `/signal/${encodeURIComponent(visitId)}/${encodeURIComponent(signalKey)}/${encodeURIComponent(value)}`,
          (visitId, resourceType) => `/headers/${encodeURIComponent(visitId)}/${encodeURIComponent(resourceType)}`,
          (visitId) => `/waitResult/${encodeURIComponent(visitId)}`,
        ),
      )
    })
  })

  app.get('/signal/:visitId/:signalKey/:signalValue?', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      const { visitId, signalKey, signalValue = '' } = req.params
      await receiveSignal(storage, visitId, signalKey, signalValue)
      res.send()
    })
  })

  app.get('/headers/:visitId/:resourceType', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      const { visitId, resourceType } = req.params
      await receiveHeaders(storage, visitId, resourceType, makeExpressHeaderGetter(req))
      res.send()
    })
  })

  // Combines 2 actions: collects HTTP headers that the browser sends to page resources,
  // and shows an iframe page for waiting for the result
  app.get('/waitResult/:visitId', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      const { visitId } = req.params
      const getHeader = makeExpressHeaderGetter(req)
      await receiveHeaders(storage, visitId, 'page', getHeader)
      const response = renderWaitResultFrame(getHeader, `/compactResult/${encodeURIComponent(visitId)}`)
      responseToExpress(res, response)
    })
  })

  app.get('/compactResult/:visitId', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      const { visitId } = req.params
      const response = await renderResultFrame(storage, visitId, `/result/${encodeURIComponent(visitId)}`)
      responseToExpress(res, response)
    })
  })

  app.get('/result/:visitId', (req, res) => {
    catchErrorForExpress(req, res, async () => {
      const response = await renderResultPage(storage, req.params.visitId)
      responseToExpress(res, response)
    })
  })

  // This middleware is the last to make express scan the directory only if none of the app routes match
  app.use(
    express.static(path.join(__dirname, '..', 'public'), {
      index: false,
      redirect: false,
    }),
  )

  return app
}

function createStorage(): Storage {
  const pgPort = Number(process.env.DB_PORT)
  const pgPool = new pg.Pool({
    host: process.env.DB_HOST,
    port: isNaN(pgPort) ? undefined : pgPort,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  })

  pgPool.on('error', (error) => {
    console.error(`Database connection error (${error.name}): ${error.message}`)
  })

  return new PostgresStorage(pgPool)
}
