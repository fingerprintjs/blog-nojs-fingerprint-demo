import murmurHash3 from 'murmurhash3js'
import { getExponentialSequence, toCamelCase } from './utils'
import { SignalCollection, SignalSource } from './common_types'

const signalSources: readonly Readonly<SignalSource>[] = [
  {
    type: 'css',
    key: 'cssBlink',
    title: 'CSS hack to tell Chromium-based browsers from other browsers',
    getCss: (targetClassName, targetStyle) =>
      `@supports(-webkit-app-region: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },
  {
    type: 'css',
    key: 'cssGecko',
    title: 'CSS hack to tell Firefox from other browsers',
    getCss: (targetClassName, targetStyle) =>
      `@supports(-moz-appearance: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },
  {
    type: 'css',
    key: 'cssWebkit',
    title: 'CSS hack to tell Safari from other browsers',
    getCss: (targetClassName, targetStyle) =>
      `@supports(-apple-pay-button-style: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },
  {
    type: 'css',
    key: 'cssMobileWebkit',
    title: 'CSS hack to tell whether the Safari is mobile',
    getCss: (targetClassName, targetStyle) =>
      `@supports(-webkit-touch-callout: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },
  {
    type: 'css',
    key: 'cssMacGecko',
    title: 'CSS hack to tell macOS Firefox from other Firefox versions',
    getCss: (targetClassName, targetStyle) =>
      `@supports(-moz-osx-font-smoothing: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },
  // Tor has no difference in CSS properties.
  // This is just an old property that isn't available in the Tor's version of Gecko.
  {
    type: 'css',
    key: 'cssTorGecko',
    title: 'CSS hack to tell Firefox from Tor',
    getCss: (targetClassName, targetStyle) =>
      `@supports(accent-color: inherit) { .${targetClassName} { ${targetStyle} } }`,
  },

  {
    type: 'cssMediaEnum',
    key: 'cssAnyHover',
    title: 'Any hover',
    mediaName: 'any-hover',
    mediaValues: ['none', 'hover'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssHover',
    title: 'Hover',
    mediaName: 'hover',
    mediaValues: ['none', 'hover'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssAnyPointer',
    title: 'Any pointer',
    mediaName: 'any-pointer',
    mediaValues: ['none', 'coarse', 'fine'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssPointer',
    title: 'Pointer',
    mediaName: 'pointer',
    mediaValues: ['none', 'coarse', 'fine'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssColor',
    title: 'Color bitness',
    mediaName: 'color',
    mediaValues: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssColorGamut',
    title: 'Color gamut',
    mediaName: 'color-gamut',
    mediaValues: ['srgb', 'p3', 'rec2020'], // rec2020 includes p3 and p3 includes srgb
  },
  {
    type: 'cssMediaEnum',
    key: 'cssForcedColors',
    title: 'Forces colors',
    mediaName: 'forced-colors',
    mediaValues: ['none', 'active'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssInvertedColors',
    title: 'Inverted colors',
    mediaName: 'inverted-colors',
    mediaValues: ['none', 'inverted'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssMonochrome',
    title: 'Monochrome',
    mediaName: 'monochrome',
    mediaValues: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssPrefersColorScheme',
    title: 'Dark/light mode',
    mediaName: 'prefers-color-scheme',
    mediaValues: ['light', 'dark'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssPrefersContrast',
    title: 'Contrast preference',
    mediaName: 'prefers-contrast',
    mediaValues: ['no-preference', 'high', 'more', 'low', 'less', 'forced'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssPrefersReducedMotion',
    title: 'Reduced motion',
    mediaName: 'prefers-reduced-motion',
    mediaValues: ['no-preference', 'reduce'],
  },
  {
    type: 'cssMediaEnum',
    key: 'cssDynamicRange',
    title: 'Screen dynamic range',
    mediaName: 'dynamic-range',
    mediaValues: ['standard', 'high'],
  },
  {
    type: 'cssMediaNumber',
    key: 'cssResolution',
    title: 'Pixel density',
    mediaName: 'device-pixel-ratio',
    getRangeBreakpoints: () => getExponentialSequence(0.5, 5, 1.15, 0.1),
    vendorPrefix: '-webkit-',
  },
  {
    type: 'cssMediaNumber',
    key: 'cssScreenWidth',
    title: 'Screen width',
    mediaName: 'device-width',
    // The width and height must have the same breakpoints
    // because they can be swapped to mitigate a changing device orientation
    getRangeBreakpoints: () => getExponentialSequence(320, 2700, 1.1, 10),
    valueUnit: 'px',
  },
  {
    type: 'cssMediaNumber',
    key: 'cssScreenHeight',
    title: 'Screen height',
    mediaName: 'device-height',
    getRangeBreakpoints: () => getExponentialSequence(320, 2700, 1.1, 10),
    valueUnit: 'px',
  },

  ...[
    'Roboto', // Most likely available only on Android and ChromeOS
    'Ubuntu', // Most likely available only on Ubuntu
    'Calibri', // Most likely available only on Windows
    'MS UI Gothic', // Most likely available only on Windows
    'Gill Sans', // Most likely available only on macOS
    'Helvetica Neue', // Most likely available only on macOS and iOS
    'Arimo', // Most likely available only on ChromeOS. Other exclusive fonts: Tinos, Cousine, Caladea, Carlito
  ].map((fontName) => ({
    type: 'fontAbsence' as const,
    key: `${toCamelCase(fontName)}FontAbsence`,
    title: `“${fontName}” font`,
    fontName,
  })),

  {
    type: 'httpHeader',
    key: 'languageHeader',
    title: 'Language',
    resourceType: 'page',
    headerName: 'Accept-Language',
    // Chrome changes a part of the header in incognito mode
    getSignificantPart: (headerValue) => headerValue.split(',', 1)[0],
  },
  {
    type: 'httpHeader',
    key: 'acceptEncodingHeader',
    title: 'Accepted encoding',
    resourceType: 'page',
    headerName: 'Accept-Encoding',
  },
  {
    type: 'httpHeader',
    key: 'pageAcceptHeader',
    title: 'Accept header for web page',
    resourceType: 'page',
    headerName: 'Accept',
  },
  {
    type: 'httpHeader',
    key: 'imageAcceptHeader',
    title: 'Accept header for image',
    resourceType: 'image',
    headerName: 'Accept',
  },
  {
    type: 'httpHeader',
    key: 'styleAcceptHeader',
    title: 'Accept header for stylesheet',
    resourceType: 'style',
    headerName: 'Accept',
  },
]

export default signalSources

export function getFingerprint(signals: Readonly<SignalCollection>): string {
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
