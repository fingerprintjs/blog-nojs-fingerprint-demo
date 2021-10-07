import { escapeHtml, HttpResponse } from '../utils'
import signalSources from '../signal_sources'
import renderFrameLayout from '../view/frame_layout'

/**
 * The client hints that should be requested before running this endpoint
 */
export const clientHintHeaders = ['Downlink'] as const

/**
 * A page with a placeholder to show inside a frame while waiting for the result.
 * Some time is required to pass before calculating the fingerprint in order to collect all the signals.
 * The result doesn't appear automatically because the more time passes the higher the chance to get all the signals.
 */
export default function waitResultFrame(
  getHeader: (name: string) => string | undefined,
  resultFrameUrl: string,
): HttpResponse {
  const resultPromptDelay = getResultDelay(getHeader('Downlink'))
  const resultRedirectDelay = resultPromptDelay * 3

  const lowerHeadHtml = `
<style>
  @keyframes keep-hidden {
    from {
      visibility: hidden;
      position: absolute;
      top: 0;
      left: -9999px;
    }
    to {}
  }
  @keyframes keep-visible {
    from {
      visibility: visible;
      position: static;
      top: auto;
      left: auto;
    }
    to {}
  }
  .__delay {
    animation-duration: ${resultPromptDelay.toFixed(2)}s;
    animation-timing-function: step-end;
  }
  .__loading {
    animation-name: keep-visible;
    visibility: hidden;
    position: absolute;
    top: 0;
    left: -9999px;
  }
  .__ready {
    animation-name: keep-hidden;
  }
</style>`

  const bodyHtml = `
<div class="__loading __delay">
  <div>Your fingerprint:</div>
  <h3 class="fp-block__loading">Gathering data...</h3>
</div>

<div class="__ready __delay">
  <div>Your fingerprint is ready</div>
  <div>
    <a href="${escapeHtml(resultFrameUrl)}" class="fp-block__button">Show</a>
  </div>
</div>`

  const response = renderFrameLayout({
    htmlTitle: 'Making the fingerprint',
    lowerHeadHtml,
    bodyHtml,
  })

  return {
    ...response,
    headers: {
      ...response.headers,
      'Cache-Control': 'no-cache, must-revalidate',
      Refresh: `${Math.ceil(resultRedirectDelay)};url=${resultFrameUrl}`,
    },
  }
}

const meanSignalRequestCount = signalSources.reduce(
  (count, source) => {
    switch (source.type) {
      case 'css':
        return count + 0.5
      case 'cssMediaEnum':
        return count + 0.9
      case 'cssMediaNumber':
        return count + 1
      case 'httpHeader':
        return count
      case 'fontAbsence':
        return count + 0.8
    }
  },
  5, // 1 per each HTTP header resource type
)

/**
 * Decides the time to wait for the result depending on the network connection speed
 */
function getResultDelay(downlink: string | undefined): number {
  let downlinkNumber = Number(downlink)
  if (isNaN(downlinkNumber)) {
    downlinkNumber = 1
  }
  return meanSignalRequestCount / 6.46 / downlinkNumber
}
