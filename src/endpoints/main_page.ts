import UAParser from 'ua-parser-js'
import signalSources from '../signal_sources'
import { HttpHeaderSignalSource, Storage } from '../common_types'
import { escapeHtml, HttpResponse } from '../utils'
import { clientHintHeaders as resultDelayChHeaders } from './wait_result_frame'

/**
 * Makes a URL that the browser will request if the signal activates
 */
type SignalActivationUrlFactory = (visitId: string, signalKey: string, signalValue: string) => string

/**
 * Makes a URL that the browser will request anyway for the backend to read the headers
 */
type HeaderProbeUrlFactory = (visitId: string, resourceType: HttpHeaderSignalSource['resourceType']) => string

/**
 * Makes a URL of the iframe to show the result
 */
type ResultUrlFactory = (visitId: string) => string

/**
 * The main page that makes browser send HTTP requests that reveal information about the browser
 */
export default async function renderMainPage(
  storage: Storage,
  ip: string,
  userAgent: string,
  getSignalActivationUrl: SignalActivationUrlFactory,
  getHeaderProbeUrl: HeaderProbeUrlFactory,
  getResultFrameUrl: ResultUrlFactory,
): Promise<HttpResponse> {
  const visitId = await storage.createVisit(ip, userAgent)
  const codeForCssSignalSources = makeCodeForCssSignalSources(visitId, getSignalActivationUrl)

  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>No-JavaScript fingerprinting</title>
    <style>
${codeForCssSignalSources.css.join('\n')}
    </style>
    <link rel="stylesheet" href="${escapeHtml(getHeaderProbeUrl(visitId, 'style'))}" />
  </head>
  <body>
    <h1>No-JS fingerprinting</h1>
    <p>
      Fingerprinting is a way to identify browsers without cookies or other data storages.
      Fingerprints are calculated based on properties of your device such as the language and the installed fonts.
      Your fingerprint will stay the same even if you use the incognito mode of your browser.
    </p>
    <p>
      This demo shows that fingerprinting is possible even when JavaScript is turned off.
      Disable JavaScript, disable cookies and check how it works.
    </p>
    <div>
      <iframe src="${escapeHtml(getResultFrameUrl(visitId))}"></iframe>
    </div>
    ${renderDisableJsGuide(userAgent) || ''}
    <p>
      Read <a href="https://fingerprintjs.com/blog">an article about no-JavaScript fingerprinting</a>
      and see <a href="https://github.com/fingerprintjs/blog-nojs-fingerprint-demo/">the source code of this demo</a>
      to learn how it works.
    </p>
    <noscript>
      <div>
        <img src="https://media.makeameme.org/created/it-is-magic-5b4cb3.jpg" alt="It's magic" style="max-width: 100%;" />
      </div>
    </noscript>
    <div style="position: absolute; top: 0; left: -9999px;">
      <img src="${escapeHtml(getHeaderProbeUrl(visitId, 'image'))}" alt="" />
      <video src="${escapeHtml(getHeaderProbeUrl(visitId, 'video'))}"></video>
      <audio src="${escapeHtml(getHeaderProbeUrl(visitId, 'audio'))}"></audio>
${codeForCssSignalSources.html.join('\n')}
    </div>
  </body>
</html>`

  return {
    body,
    headers: {
      'Accept-CH': [...resultDelayChHeaders, ...getClientHintHeaders()].join(', '),
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

function getClientHintHeaders() {
  const names: string[] = []
  for (const signalSource of signalSources) {
    if (signalSource.type === 'httpHeader' && signalSource.isClientHint) {
      names.push(signalSource.headerName)
    }
  }
  return names
}

function renderDisableJsGuide(userAgent: string): string | undefined {
  const userAgentData = new UAParser(userAgent)
  const isIos = () => userAgentData.getOS().name === 'iOS'
  const isMobile = () => (['mobile', 'tablet'] as unknown[]).includes(userAgentData.getDevice().type)

  switch (userAgentData.getBrowser().name) {
    case 'Safari':
      return `<h4>How to disable JavaScript in Safari:</h4>
<ol>
  <li>Click "Safari" in the top menu, then "Preferences..."</li>
  <li>Click the "Security" tab</li>
  <li>Remove the checkmark next to "Enable JavaScript"</li>
</ol>`

    case 'Mobile Safari':
      return `<h4>How to disable JavaScript in Safari:</h4>
<ol>
  <li>Go to the home screen, open the "Settings" application</li>
  <li>Scroll down, tap "Safari"</li>
  <li>Tap "Advanced"</li>
  <li>Turn off the "JavaScript" toggle</li>
</ol>`

    case 'Chrome':
    case 'Chromium':
      if (isIos()) {
        return `<h4>You can't disable JavaScript in Google Chrome on iOS</h4>
<p>Please try Safari</p>`
      }
      if (isMobile()) {
        return `<h4>How to disable JavaScript in Google Chrome:</h4>
<ol>
  <li>Tap the 3-dots button in the top right corner, then "Settings"</li>
  <li>Scroll down, tap "Site settings"</li>
  <li>Scroll down, tap "JavaScript"</li>
  <li>Turn off the "JavaScript" toggle</li>
</ol>`
      }
      return `<h4>How to disable JavaScript in Google Chrome:</h4>
<ol>
  <li>Click the 3-dots button in the top right corner, then "Settings"</li>
  <li>Search "JavaScript", click "Site Settings"</li>
  <li>Scroll down, click "JavaScript"</li>
  <li>Click "Don't allow sites to use Javascript"</li>
</ol>`

    case 'Firefox':
      if (isIos()) {
        return `<h4>You can't disable JavaScript in Firefox on iOS</h4>
<p>Please try Safari</p>`
      }
      if (isMobile()) {
        return `<h4>How to disable JavaScript in Firefox:</h4>
<ol>
  <li>Tap the 3-dots button in the bottom right corner, then "Add-ons"</li>
  <li>Find "NoScript", tap the plus button to install it</li>
</ol>`
      }
      return `<h4>How to disable JavaScript in Firefox:</h4>
<ol>
  <li>Open a new browser tab</li>
  <li>Type <code>about:config</code> in the address bar, press <kbd>Enter</kbd></li>
  <li>Search "javascript.enabled"</li>
  <li>Click the toggle button until "true" changes to "false"</li>
</ol>`

    case 'Opera':
      if (isIos()) {
        return `<h4>You can't disable JavaScript in Opera on iOS</h4>
<p>Please try Safari</p>`
      }
      if (isMobile()) {
        return `<h4>You can't disable JavaScript in Opera on ${userAgentData.getOS().name}</h4>
<p>Please try Google Chrome</p>`
      }
      return `<h4>How to disable JavaScript in Opera:</h4>
<ol>
  <li>Click the settings button in the top right corner, scroll down and click "Go to full browser settings"</li>
  <li>Search "JavaScript", click "Site Settings"</li>
  <li>Scroll down, click "JavaScript"</li>
  <li>Click "Don't allow sites to use Javascript"</li>
</ol>`

    case 'Yandex':
      if (isIos()) {
        return `<h4>You can't disable JavaScript in Yandex Browser on iOS</h4>
<p>Please try Safari</p>`
      }
      if (isMobile()) {
        return `<h4>You can't disable JavaScript in Yandex Browser on ${userAgentData.getOS().name}</h4>
<p>Please try Google Chrome</p>`
      }
      return `<h4>How to disable JavaScript in Yandex Browser:</h4>
<ol>
  <li>Click the hamburger button in the top right corner, then "Settings"</li>
  <li>Search "JavaScript", click "Content settings"</li>
  <li>Scroll down, click "Do not allow any site to run JavaScript"</li>
</ol>`
  }
  return undefined
}
