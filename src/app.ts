import express from 'express'
import { InMemoryStorage } from './storage'
import renderMainPage from './endpoints/main_page'
import receiveSignal from './endpoints/receive_signal'
import receiveHeaders from './endpoints/receive_headers'
import renderResultPage from './endpoints/result_page'
import { responseToExpress } from './utils'

const visitLifetimeMs = 24 * 60 * 60 * 1000

export default async function initApp(): Promise<express.Express> {
  const storage = new InMemoryStorage()
  const app = express()

  app.get('/', async (_req, res) => {
    responseToExpress(
      res,
      await renderMainPage(
        storage,
        visitLifetimeMs,
        (visitId, signalKey, signalValue) =>
          `/signal/${encodeURIComponent(visitId)}/${encodeURIComponent(signalKey)}/${encodeURIComponent(signalValue)}`,
        (visitId, resourceType) => `/headers/${encodeURIComponent(visitId)}/${encodeURIComponent(resourceType)}`,
        (visitId) => `/result/${encodeURIComponent(visitId)}`,
      ),
    )
  })

  app.get('/signal/:visitId/:signalKey/:signalValue?', async (req, res) => {
    const { visitId, signalKey, signalValue = '' } = req.params
    await receiveSignal(storage, visitId, signalKey, signalValue)
    res.send()
  })

  app.get('/headers/:visitId/:resourceType', async (req, res) => {
    const { visitId, resourceType } = req.params
    const getHeader = (headerName: string) => req.header(headerName)
    await receiveHeaders(storage, visitId, resourceType, getHeader)
    res.send()
  })

  app.get('/result/:visitId', async (req, res) => {
    responseToExpress(res, await renderResultPage(storage, req.params.visitId))
  })

  return app
}
