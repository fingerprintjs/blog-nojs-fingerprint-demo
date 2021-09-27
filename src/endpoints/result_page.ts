import { Storage } from '../storage'
import signalSources from '../signal_sources'
import { escapeHtml, HttpResponse } from '../utils'
import { SignalCollection, SignalSource } from '../common_types'

/**
 * Shows the collected signals and the fingerprint of the given visit
 */
export default async function resultPage(storage: Storage, visitId: string): Promise<HttpResponse> {
  const visit = await storage.finalizeAndGetVisit(visitId, true)
  if (!visit) {
    return notFoundPage()
  }

  const fingerprintAge = Date.now() - visit.finalizedAt.getTime()

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>No-JavaScript fingerprinting — result</title>
  </head>
  <body>
    <div><a href="/">Go to the start</a></div>
    <div>Fingerprint: ${escapeHtml(visit.fingerprint)}</div>
    ${
      fingerprintAge > 2 * 60 * 1000
        ? '<div>' +
          `The fingerprint was obtained more than ${Math.floor(fingerprintAge / 60 / 1000)} minutes ago. ` +
          "Probably, it doesn't belong to your browser. " +
          'Get your fingerprint <a href="/">here</a>. ' +
          '</div>'
        : ''
    }
    <ul>
      ${signalSources.map((signalSource) => renderSignal(signalSource, visit.signals)).join('\n')}
    </ul>
  </body>
</html>`

  return {
    body,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }
}

function renderSignal(source: Readonly<SignalSource>, signals: Readonly<SignalCollection>): string {
  const signalValue = signals[source.key] as SignalCollection[string] | undefined
  const isDiscarded = source.shouldDiscard?.(signals)

  let html = `<li ${isDiscarded ? 'style="text-decoration: line-through"' : ''}>`

  html += `<div>Title: ${escapeHtml(source.title)}</div>`
  html += `<div>Type: ${escapeHtml(source.type)}</div>`

  switch (source.type) {
    case 'css':
      html += `<div>CSS: ${escapeHtml(source.getCss('selector', ''))}</div>`
      break
    case 'cssMediaEnum':
      html += `<div>CSS: @media (${source.mediaName}: ...) {  }</div>`
      break
    case 'cssMediaNumber':
      html +=
        '<div>' +
        `CSS: @media (${source.vendorPrefix ?? ''}min-${source.mediaName}: ...) ` +
        `and (${source.vendorPrefix ?? ''}max-${source.mediaName}: ...) {  }` +
        '</div>'
      break
    case 'httpHeader':
      html += `<div>HTTP header name: ${source.headerName}</div>`
      break
    case 'fontAbsence':
      html += `<div>Font name: ${escapeHtml(source.fontName)}</div>`
      break
  }

  html += `<div>Value: <strong>`
  switch (source.type) {
    case 'css':
      html += signalValue === undefined ? 'No' : 'Yes'
      break
    case 'fontAbsence':
      html += signalValue === undefined ? 'Yes' : 'No'
      break
    case 'cssMediaNumber':
      html +=
        signalValue === undefined
          ? '(undefined)'
          : escapeHtml(
              signalValue
                .split(',', 2)
                .map((part, index) => `${index === 0 ? '≥' : '<'}${part}${source.valueUnit ?? ''}`)
                .join(', '),
            )
      break
    default:
      html += signalValue === undefined ? '(undefined)' : escapeHtml(signalValue || '(empty)')
  }
  html += '</strong></div>'

  html += '</li>'
  return html
}

function notFoundPage(): HttpResponse {
  return {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: 'The visit is not found. <a href="/">Back to the start</a>.',
  }
}
