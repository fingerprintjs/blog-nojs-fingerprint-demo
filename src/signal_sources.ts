import { getExponentialSequence, toCamelCase } from './utils'
import { SignalCollection } from './storage'

/**
 * A source of signal: a CSS code that applies a style to an element in specific conditions
 */
export interface CssSignalSource {
  type: 'css'
  /**
   * Makes a CSS code that will apply the given style to the given class name only in the specific conditions
   */
  getCss(targetClassName: string, targetStyle: string): string
}

/**
 * A source of signal: a CSS media rule that can have one of the given values
 */
export interface CssMediaEnumSignalSource {
  type: 'cssMediaEnum'
  mediaName: string
  /**
   * If the media matches multiple of the values, the latest will be used as the signal value
   */
  mediaValues: readonly string[]
}

/**
 * A source of signal: a CSS media rule thats value is a number
 */
export interface CssMediaNumberSignalSource {
  type: 'cssMediaNumber'
  mediaName: string
  vendorPrefix?: string
  valueUnit?: string
  getRangeBreakpoints(): Iterable<number>
}

/**
 * A source of signal: an HTTP request header
 */
export interface HttpHeaderSignalSource {
  type: 'httpHeader'
  resourceType: 'page' | 'image' | 'video' | 'audio' | 'style'
  headerName: string
  isClientHint?: boolean
  getSignificantPart?(headerValue: string): string
}

/**
 * A source of signal: an absence of a font in the visitor's browser
 */
export interface FontSignalSource {
  type: 'fontAbsence'
  fontName: string
}

export type SignalSource = (
  | CssSignalSource
  | CssMediaEnumSignalSource
  | CssMediaNumberSignalSource
  | HttpHeaderSignalSource
  | FontSignalSource
) & {
  key: string
  title: string
  /**
   * Implement this method to remove this signal from the fingerprint calculation if some conditions are met.
   */
  shouldDiscard?(allSignals: Readonly<SignalCollection>): boolean
}

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
    title: 'Dixel density',
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
    'Roboto', // Most likely available only on Android
    'Ubuntu', // Most likely available only on Ubuntu
    'Calibri', // Most likely available only on Windows
    'MS UI Gothic', // Most likely available only on Windows
    'Gill Sans', // Most likely available only on macOS
    'Helvetica Neue', // Most likely available only on macOS and iOS
  ].map((fontName) => ({
    type: 'fontAbsence' as const,
    key: `${toCamelCase(fontName)}FontAbsence`,
    title: `"${fontName}" font`,
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
    key: 'deviceMemoryHeader',
    title: 'Device memory',
    resourceType: 'page',
    headerName: 'Device-Memory',
    isClientHint: true,
  },
  {
    type: 'httpHeader',
    key: 'userAgentHeader',
    title: 'User-agent client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA',
    isClientHint: true,
  },
  {
    type: 'httpHeader',
    key: 'fullUserAgentHeader',
    title: 'Full user-agent client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA-Full-Version',
    isClientHint: true,
  },
  {
    type: 'httpHeader',
    key: 'platformHeader',
    title: 'Platform client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA-Platform',
    isClientHint: true,
    // Android Chrome pretends to be Linux when the user requests a desktop version of the site.
    // The platform signals are excluded on Android and Linux to stabilize the fingerprint.
    shouldDiscard: (signals) => ['"Android"', '"Linux"'].includes(signals.platformHeader),
  },
  {
    type: 'httpHeader',
    key: 'platformVersionHeader',
    title: 'Platform version client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA-Platform-Version',
    isClientHint: true,
    shouldDiscard: (signals) => ['"Android"', '"Linux"'].includes(signals.platformHeader),
  },
  {
    type: 'httpHeader',
    key: 'architectureHeader',
    title: 'Platform architecture client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA-Arch',
    isClientHint: true,
    shouldDiscard: (signals) => ['"Android"', '"Linux"'].includes(signals.platformHeader),
  },
  {
    type: 'httpHeader',
    key: 'bitnessHeader',
    title: 'Device bitness client hint',
    resourceType: 'page',
    headerName: 'Sec-CH-UA-Bitness',
    isClientHint: true,
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
    key: 'videoAcceptHeader',
    title: 'Accept header for video',
    resourceType: 'video',
    headerName: 'Accept',
  },
  {
    type: 'httpHeader',
    key: 'audioAcceptHeader',
    title: 'Accept header for audio',
    resourceType: 'audio',
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
