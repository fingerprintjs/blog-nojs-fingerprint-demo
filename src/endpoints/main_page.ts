import { Storage } from '../storage'
import signalSources, { HttpHeaderSignalSource } from '../signal_sources'
import { escapeHtml, HttpResponse } from '../utils'

/**
 * Makes a URL that the browser will request if the signal activates
 */
type SignalActivationUrlFactory = (visitId: string, signalKey: string, signalValue: string) => string

/**
 * Makes a URL that the browser will request anyway for the backend to read the headers
 */
type HeaderProbeUrlFactory = (visitId: string, resourceType: HttpHeaderSignalSource['resourceType']) => string

/**
 * Makes a URL where the visitor should navigate to see the result
 */
type ResultUrlFactory = (visitId: string) => string

/**
 * The main page that makes browser send HTTP requests that reviel information about the browser
 */
export default async function renderMainPage(
  storage: Storage,
  visitLifetimeMs: number,
  getSignalActivationUrl: SignalActivationUrlFactory,
  getHeaderProbeUrl: HeaderProbeUrlFactory,
  getResultUrl: ResultUrlFactory,
): Promise<HttpResponse> {
  const visitId = await storage.createVisit(visitLifetimeMs)
  const codeForCssSignalSources = makeCodeForCssSignalSources(visitId, getSignalActivationUrl)

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>No-JavaScript fingerprinting</title>
    <link rel="stylesheet" href="${escapeHtml(getHeaderProbeUrl(visitId, 'style'))}" />
    <style>
${codeForCssSignalSources.css.join('\n')}
    </style>
  </head>
  <body>
    <div>Hello, world</div>
    <a href="${escapeHtml(getResultUrl(visitId))}">See my id</a>
    <div style="position: absolute; top: 0; left: -9999px;">
      <iframe src="${escapeHtml(getHeaderProbeUrl(visitId, 'page'))}"></iframe>
      <img src="${escapeHtml(getHeaderProbeUrl(visitId, 'image'))}" />
      <video src="${escapeHtml(getHeaderProbeUrl(visitId, 'video'))}"></video>
      <audio src="${escapeHtml(getHeaderProbeUrl(visitId, 'audio'))}"></audio>
${codeForCssSignalSources.html.join('\n')}
    </div>
  </body>
</html>`

  return {
    body,
    headers: {
      'Accept-CH': getClientHintHeader().join(', '),
      'Content-Type': 'text/html; charset=utf-8',
    },
  }
}

function makeCodeForCssSignalSources(visitId: string, getSignalActivationUrl: SignalActivationUrlFactory) {
  const css: string[] = []
  const html: string[] = []
  let probeCount = 0

  for (const signalSource of signalSources) {
    switch (signalSource.type) {
      case 'css': {
        const className = `css_probe_${++probeCount}`
        const style = `background: url('${getSignalActivationUrl(visitId, signalSource.key, '')}')`
        html.push(`<div class="${escapeHtml(className)}"></div>`)
        css.push(signalSource.getCss(className, style))
        break
      }
      case 'cssMediaEnum': {
        const className = `css_probe_${++probeCount}`
        html.push(`<div class="${escapeHtml(className)}"></div>`)
        for (const value of signalSource.mediaValues) {
          const style = `background: url('${getSignalActivationUrl(visitId, signalSource.key, value)}')`
          css.push(`@media (${signalSource.mediaName}: ${value}) { .${className} { ${style} } }`)
        }
        break
      }
      case 'cssMediaNumber': {
        const className = `css_probe_${++probeCount}`
        html.push(`<div class="${escapeHtml(className)}"></div>`)

        let previousBreakpoint: number | undefined
        const makeCssRule = (min: number | undefined, max: number | undefined) => {
          const { key, mediaName, vendorPrefix = '', valueUnit = '' } = signalSource
          const activationUrl = getSignalActivationUrl(
            visitId,
            key,
            [min, max].map((value) => (value === undefined ? '' : String(value))).join(','),
          )
          return (
            '@media ' +
            (min === undefined ? '' : `(${vendorPrefix}min-${mediaName}: ${min}${valueUnit})`) +
            (min === undefined || max === undefined ? '' : ' and ') +
            (max === undefined ? '' : `(${vendorPrefix}max-${mediaName}: ${max - 0.00001}${valueUnit})`) +
            ` { .${className} { background: url('${activationUrl}') } }`
          )
        }

        for (const breakpoint of signalSource.getRangeBreakpoints()) {
          css.push(makeCssRule(previousBreakpoint, breakpoint))
          previousBreakpoint = breakpoint
        }
        if (previousBreakpoint !== undefined) {
          css.push(makeCssRule(previousBreakpoint, undefined))
        }
        break
      }
      case 'fontAbsence': {
        html.push(`<div style="font-family: '${signalSource.fontName}'">a</div>`)
        css.push(
          '@font-face { ' +
            `font-family: '${signalSource.fontName}'; ` +
            `src: local('${signalSource.fontName}'), ` +
            `url('${getSignalActivationUrl(visitId, signalSource.key, '')}') format('truetype') }`,
        )
        break
      }
    }
  }

  return { css, html }
}

function getClientHintHeader() {
  const names: string[] = []
  for (const signalSource of signalSources) {
    if (signalSource.type === 'httpHeader' && signalSource.isClientHint) {
      names.push(signalSource.headerName)
    }
  }
  return names
}
