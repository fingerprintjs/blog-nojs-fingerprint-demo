import { Storage } from '../storage'
import { escapeHtml, HttpResponse } from '../utils'

/**
 * A page to show the fingerprint of the given visit inside a frame
 */
export default async function resultFrame(
  storage: Storage,
  visitId: string,
  fullResultUrl: string,
): Promise<HttpResponse> {
  const visit = await storage.finalizeAndGetVisit(visitId)
  if (!visit) {
    return notFoundPage()
  }

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  </head>
  <body>
    <div>Fingerprint: ${escapeHtml(visit.fingerprint)}</div>
    <div><a href="${escapeHtml(fullResultUrl)}" target="_top">See more details</a></div>
  </body>
</html>`

  return {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body,
  }
}

function notFoundPage(): HttpResponse {
  return {
    status: 404,
    body: 'Visit is not found. Please try again.',
  }
}
