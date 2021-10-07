import signalSources from '../signal_sources'
import { escapeHtml, HttpResponse } from '../utils'
import { SignalCollection, SignalSource, Storage } from '../common_types'
import renderLayout from '../view/layout'
import renderNotFoundPage from '../view/not_found_page'
import renderSocialHeaders from '../view/social_headers'

/**
 * Shows the collected signals and the fingerprint of the given visit
 */
export default async function resultPage(storage: Storage, visitId: string, requestUrl: string): Promise<HttpResponse> {
  const visit = await storage.finalizeAndGetVisit(visitId, true)
  if (!visit) {
    return renderNotFoundPage()
  }

  const fingerprintAge = Date.now() - visit.finalizedAt.getTime()

  const bodyHtml = `
${
  fingerprintAge > 5 * 60 * 1000
    ? `
<div class="outdated-warning">
  <img src="/images/warning.svg" alt="Warning" loading="lazy" class="outdated-warning__icon" />
  <p>
    The fingerprint was generated more than ${getDurationText(fingerprintAge).replace(/ /g, '&nbsp;')} ago.
    It probably doesn't belong to your&nbsp;browser.
    <a href="/">Start&nbsp;over</a> to&nbsp;get your&nbsp;fingerprint.
  </p>
</div>`
    : ''
}
<div class="fp-block">
  <div>Your fingerprint:</div>
  <div class="fp-block__fingerprint">${escapeHtml(visit.fingerprint)}</div>
  <div><a href="/">Start over →</a></div>
</div>
<h2 class="signals__header">Signals</h2>
<ul class="signals__list">
  ${signalSources.map((signalSource) => renderSignal(signalSource, visit.signals)).join('\n')}
</ul>`

  return renderLayout({
    lowerHeadHtml: renderSocialHeaders(
      requestUrl,
      `My fingerprint is ${visit.fingerprint}`,
      'This fingerprint was obtained without JavaScript and cookies',
    ),
    htmlTitle: 'Your fingerprint',
    bodyHtml,
  })
}

function renderSignal(source: Readonly<SignalSource>, signals: Readonly<SignalCollection>): string {
  const signalValue = signals[source.key] as SignalCollection[string] | undefined
  const isDiscarded = source.shouldDiscard?.(signals)

  const details: [label: string, value: string, isEmpty?: boolean][] = []

  switch (source.type) {
    case 'css':
      details.push(['CSS', source.getCss('selector', '')])
      break
    case 'cssMediaEnum':
      details.push(['CSS', `@media (${source.mediaName}: ...) {  }`])
      break
    case 'cssMediaNumber':
      details.push([
        'CSS',
        `@media (${source.vendorPrefix ?? ''}min-${source.mediaName}: ...) ` +
          `and (${source.vendorPrefix ?? ''}max-${source.mediaName}: ...) {  }`,
      ])
      break
    case 'httpHeader':
      details.push(['HTTP header name', source.headerName])
      break
    case 'fontAbsence':
      details.push(['Font name', source.fontName])
      break
  }

  switch (source.type) {
    case 'css':
      details.push(['Value', signalValue === undefined ? 'No' : 'Yes'])
      break
    case 'fontAbsence':
      details.push(['Value', signalValue === undefined ? 'Yes' : 'No'])
      break
    case 'cssMediaNumber':
      if (signalValue === undefined) {
        details.push(['Value', '(undefined)', true])
      } else {
        details.push([
          'Value',
          signalValue
            .split(',', 2)
            .map((part, index) => `${index === 0 ? '≥' : '<'}${part}${source.valueUnit ?? ''}`)
            .join(', '),
        ])
      }
      break
    default:
      if (signalValue) {
        details.push(['Value', signalValue])
      } else {
        details.push(['Value', signalValue === undefined ? '(undefined)' : '(empty)', true])
      }
  }

  return `<li ${isDiscarded ? 'class="signals__excluded"' : ''}>
  <h5 class="signals__title">
    <span>${escapeHtml(source.title)}</span>&nbsp;
    ${isDiscarded ? `<span class="signals__exclude-label">Excluded</span>` : ''}
  </h5>
  ${details
    .map(
      ([label, value, isEmpty]) => `
  <div class="signals__detail">
    <span class="signals__detail-label">${escapeHtml(label)}</span>
    <span class="signals__detail-value ${isEmpty ? 'signals__detail-value_empty' : ''}">${escapeHtml(value)}</span>
  </div>`,
    )
    .join('')}
</li>`
}

function getDurationText(durationMs: number): string {
  if (durationMs >= 24 * 60 * 60 * 1000) {
    const daysCount = Math.floor(durationMs / 24 / 60 / 60 / 1000)
    return daysCount === 1 ? 'a day' : `${daysCount} days`
  }
  if (durationMs >= 60 * 60 * 1000) {
    const hoursCount = Math.floor(durationMs / 60 / 60 / 1000)
    return hoursCount === 1 ? 'an hour' : `${hoursCount} hours`
  }
  if (durationMs >= 60 * 1000) {
    const minutesCount = Math.floor(durationMs / 60 / 1000)
    return minutesCount === 1 ? 'a minute' : `${minutesCount} minutes`
  }
  const secondsCount = Math.floor(durationMs / 1000)
  return secondsCount === 1 ? 'a second' : `${secondsCount} seconds`
}
