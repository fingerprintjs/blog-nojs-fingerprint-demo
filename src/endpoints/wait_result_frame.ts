import { escapeHtml, HttpResponse } from '../utils'
import signalSources from '../signal_sources'

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
  const resultDelay = getResultDelay(getHeader('Downlink'))

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <style>
      @keyframes keepHidden {
        from {
          visibility: hidden;
          position: absolute;
          top: 0;
          left: -9999px;
        }
        to {}
      }
      @keyframes keepVisible {
        from {
          visibility: visible;
          position: static;
        }
        to {
          visibility: visible;
        }
      }
      .resultDelay {
        animation-duration: ${resultDelay.toFixed(2)}s;
        animation-timing-function: step-end;
      }
      .resultPlaceholder {
        animation-name: keepVisible;
        visibility: hidden;
        position: absolute;
        top: 0;
        left: -9999px;
      }
      .resultBlock {
        animation-name: keepHidden;
      }
    </style>
  </head>
  <body>
    <div class="resultPlaceholder resultDelay">
      Collecting data, please wait...
    </div>
    <div class="resultBlock resultDelay">
      <a href="${escapeHtml(resultFrameUrl)}">See my fingerprint</a>
    </div>
  </body>
</html>`

  return {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, must-revalidate',
    },
    body,
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
    downlinkNumber = 1.5
  }
  return 1 + meanSignalRequestCount / 12 / downlinkNumber
}
