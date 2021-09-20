import * as murmurHash3 from 'murmurhash3js'
import { Storage } from '../storage'
import signalSources, { SignalSource } from '../signal_sources'
import { escapeHtml, HttpResponse } from '../utils'

/**
 * Shows the collected signals and the visitor id of the given visit
 */
export default async function resultPage(storage: Storage, visitId: string): Promise<HttpResponse> {
  await storage.finalize(visitId)
  const signalArray = await storage.getSignals(visitId)

  if (!signalArray) {
    return {
      status: 404,
      body: 'Not found',
    }
  }

  const signals: Record<string, string> = {}
  for (const { key, value } of signalArray) {
    signals[key] = value
  }

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>No-JavaScript fingerprinting — result</title>
  </head>
  <body>
    <div><a href="/">Go to the start</a></div>
    <div>Fingerprint: ${escapeHtml(getFingerprint(signals))}</div>
    <ul>
      ${signalSources.map((signalSource) => renderSignal(signalSource, signals[signalSource.key])).join('\n')}
    </ul>
  </body>
</html>`

  return {
    body,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }
}

function getFingerprint(signals: Readonly<Record<string, string>>): string {
  // The order of the signals gives no imformation, so the keys are sorted to improve the stability
  const canonicalSignals: Record<string, string> = {}

  for (const signalKey of Object.keys(signals).sort()) {
    canonicalSignals[signalKey] = signals[signalKey]
  }

  // When the device orientation changes on Android, the screen width and height swap.
  // This is a hack to prevent changing the id in this case.
  ;[canonicalSignals.screenWidth, canonicalSignals.screenHeight] = [
    canonicalSignals.screenWidth,
    canonicalSignals.screenHeight,
  ].sort()

  return murmurHash3.x64.hash128(JSON.stringify(canonicalSignals))
}

function renderSignal(source: Readonly<SignalSource>, signalValue: string | undefined): string {
  let html = '<li>'

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
      html += `<div>CSS: @media (min-${source.mediaName}: ...) and (max-${source.mediaName}: ...) {  }</div>`
      break
    case 'httpHeader':
      html += `<div>HTTP header name: ${source.headerName}</div>`
      break
  }

  html += `<div>Value: `
  if (signalValue === undefined) {
    html += '(undefined)'
  } else {
    switch (source.type) {
      case 'cssMediaNumber':
        html += signalValue
          .split(',', 2)
          .map((part, index) => `${index === 0 ? '≥' : '<'}${part}${source.valueUnit}`)
          .join(', ')
        break
      default:
        html += escapeHtml(signalValue || '(empty)')
    }
  }
  html += '</div>'

  html += '</li>'
  return html
}
