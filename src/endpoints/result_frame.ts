import { Storage } from '../common_types'
import { escapeHtml, HttpResponse } from '../utils'
import renderFrameLayout from '../view/frame_layout'

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

  return renderFrameLayout({
    htmlTitle: 'My fingerprint',
    bodyHtml: `
<div>Your fingerprint:</div>
<div class="fp-block__fingerprint">${escapeHtml(visit.fingerprint)}</div>
<div><a href="${escapeHtml(fullResultUrl)}" target="_top">See more details →</a></div>`,
  })
}

function notFoundPage(): HttpResponse {
  return {
    status: 404,
    body: 'Visit is not found. Please try again.',
  }
}
