import signalSources from '../signal_sources'
import { HttpHeaderSignalSource, Storage } from '../common_types'
import { escapeHtml, HttpResponse } from '../utils'
import renderLayout from '../view/layout'
import renderHeroTitle from '../view/hero_title'
import renderJsDisableGuide from '../view/js_disable_guide'
import renderSocialHeaders from '../view/social_headers'
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

interface Options {
  storage: Storage
  requestUrl: string
  ip: string
  userAgent: string
  getSignalActivationUrl: SignalActivationUrlFactory
  getHeaderProbeUrl: HeaderProbeUrlFactory
  getResultFrameUrl: ResultUrlFactory
}

/**
 * The main page that makes browser send HTTP requests that reveal information about the browser
 */
export default async function renderMainPage({
  storage,
  requestUrl,
  ip,
  userAgent,
  getSignalActivationUrl,
  getHeaderProbeUrl,
  getResultFrameUrl,
}: Options): Promise<HttpResponse> {
  const visitId = shouldIgnoreVisit(userAgent) ? '-' : await storage.createVisit(ip, userAgent)
  const codeForCssSignalSources = makeCodeForCssSignalSources(visitId, getSignalActivationUrl)
  const jsDisableGuide = renderJsDisableGuide(userAgent)

  const upperHeadHtml = `
<style>\n${codeForCssSignalSources.css.join('\n')}\n</style>
<link rel="stylesheet" href="${escapeHtml(getHeaderProbeUrl(visitId, 'style'))}" />`

  const bodyHtml = `
<div style="position: absolute; top: 0; left: -9999px;">
  <img src="${escapeHtml(getHeaderProbeUrl(visitId, 'image'))}" alt="" />
${codeForCssSignalSources.html.join('\n')}
</div>
${renderHeroTitle('No-JS fingerprinting')}
<p>
  Fingerprinting is a&nbsp;way of identifying browsers without the&nbsp;use of&nbsp;cookies or&nbsp;data storage.
  Created using properties like language and installed fonts,
  your fingerprint stays the&nbsp;same even if&nbsp;your browser is in&nbsp;incognito mode.
</p>
<div>
  <iframe src="${escapeHtml(getResultFrameUrl(visitId))}" class="fp-frame" allowtransparency></iframe>
</div>
<p>
  This demo further illustrates that fingerprinting is&nbsp;possible — even without JavaScript and cookies.
  To&nbsp;verify this, disable JavaScript and cookies, then refresh your browser.
  Your fingerprint will remain unchanged.
</p>
${jsDisableGuide ? `<p class="js-disable__header">${escapeHtml(jsDisableGuide[0])}</p>` : ''}`

  const wideSubBodyHtml = jsDisableGuide?.[1]

  const response = renderLayout({
    // The probe HTML should go before the main HTML to send the probe requests ASAP
    upperHeadHtml,
    lowerHeadHtml: renderSocialHeaders(
      requestUrl,
      'No-JS fingerprinting',
      'This demo illustrates that fingerprinting is possible even without JavaScript and cookies',
    ),
    bodyHtml,
    wideSubBodyHtml,
  })

  return {
    ...response,
    headers: {
      ...response.headers,
      'Accept-CH': resultDelayChHeaders.join(', '),
    },
  }
}

function shouldIgnoreVisit(userAgent: string) {
  return /^ELB-HealthChecker\//i.test(userAgent)
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
