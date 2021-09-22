import * as murmurHash3 from 'murmurhash3js'
import { SignalCollection, Storage } from '../storage'
import signalSources, { SignalSource } from '../signal_sources'
import { escapeHtml, HttpResponse } from '../utils'

/**
 * Shows the collected signals and the visitor id of the given visit
 */
export default async function resultPage(storage: Storage, visitId: string): Promise<HttpResponse> {
  await storage.finalize(visitId)
  const signals = await storage.getSignals(visitId)

  if (!signals) {
    return {
      status: 404,
      body: 'Not found',
    }
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
      ${signalSources.map((signalSource) => renderSignal(signalSource, signals)).join('\n')}
    </ul>
  </body>
</html>`

  return {
    body,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }
}

function getFingerprint(signals: Readonly<SignalCollection>): string {
  const canonicalSignals: Record<string, string> = {}

  for (const source of signalSources) {
    if (!source.shouldDiscard?.(signals)) {
      canonicalSignals[source.key] = signals[source.key]
    }
  }

  // When the device orientation changes on Android, the screen width and height swap.
  // This is a hack to prevent changing the id in this case.
  ;[canonicalSignals.cssScreenWidth, canonicalSignals.cssScreenHeight] = [
    canonicalSignals.cssScreenWidth,
    canonicalSignals.cssScreenHeight,
  ].sort()

  return murmurHash3.x64.hash128(JSON.stringify(canonicalSignals))
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

  html += `<div>Value: `
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
          : signalValue
              .split(',', 2)
              .map((part, index) => `${index === 0 ? '≥' : '<'}${part}${source.valueUnit ?? ''}`)
              .join(', ')
      break
    default:
      html += signalValue === undefined ? '(undefined)' : escapeHtml(signalValue || '(empty)')
  }
  html += '</div>'

  html += '</li>'
  return html
}
