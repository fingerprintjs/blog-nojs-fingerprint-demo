import express from 'express'
import { InMemoryStorage } from './storage'
import renderMainPage from './endpoints/main_page'
import receiveSignal from './endpoints/receive_signal'
import receiveHeaders from './endpoints/receive_headers'
import renderWaitResultFrame from './endpoints/wait_result_frame'
import renderResultFrame from './endpoints/result_frame'
import renderResultPage from './endpoints/result_page'
import { makeExpressHeaderGetter, responseToExpress } from './utils'

export default async function initApp(): Promise<express.Express> {
  const storage = new InMemoryStorage()
  const app = express()

  app.get('/', async (_req, res) => {
    responseToExpress(
      res,
      await renderMainPage(
        storage,
        (visitId, signalKey, signalValue) =>
          `/signal/${encodeURIComponent(visitId)}/${encodeURIComponent(signalKey)}/${encodeURIComponent(signalValue)}`,
        (visitId, resourceType) => `/headers/${encodeURIComponent(visitId)}/${encodeURIComponent(resourceType)}`,
        (visitId) => `/waitResult/${encodeURIComponent(visitId)}`,
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
    await receiveHeaders(storage, visitId, resourceType, makeExpressHeaderGetter(req))
    res.send()
  })

  // Combines 2 actions: collects HTTP headers that the browser sends to page resources,
  // and shows an iframe page for waiting for the result
  app.get('/waitResult/:visitId', async (req, res) => {
    const { visitId } = req.params
    const getHeader = makeExpressHeaderGetter(req)
    await receiveHeaders(storage, visitId, 'page', getHeader)
    const response = renderWaitResultFrame(getHeader, `/compactResult/${encodeURIComponent(visitId)}`)
    responseToExpress(res, response)
  })

  app.get('/compactResult/:visitId', async (req, res) => {
    const { visitId } = req.params
    const response = await renderResultFrame(storage, visitId, `/result/${encodeURIComponent(visitId)}`)
    responseToExpress(res, response)
  })

  app.get('/result/:visitId', async (req, res) => {
    const response = await renderResultPage(storage, req.params.visitId)
    responseToExpress(res, response)
  })

  return app
}
