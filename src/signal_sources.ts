import { getExponentialSequence } from './utils'

/**
 * A source of signal: a CSS code that applies a style to an element in specific conditions
 */
export interface CssSignalSource {
  type: 'css'
  key: string
  title: string
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
  key: string
  title: string
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
  key: string
  title: string
  mediaName: string
  getRangeBreakpoints(): Iterable<number>
  valueUnit: string
}

/**
 * A source of signal: an HTTP request header
 */
export interface HttpHeaderSignalSource {
  type: 'httpHeader'
  key: string
  title: string
  resourceType: 'page' | 'image' | 'video' | 'audio' | 'style'
  headerName: string
  isClientHint?: boolean
  getSignificantPart?(headerValue: string): string
}

export type SignalSource =
  | CssSignalSource
  | CssMediaEnumSignalSource
  | CssMediaNumberSignalSource
  | HttpHeaderSignalSource

const signalSources: readonly Readonly<SignalSource>[] = [
  {
    type: 'css',
    key: 'testSelector',
    title: 'Test selector',
    getCss: (targetClassName, targetStyle) => `html .${targetClassName} { ${targetStyle} }`,
  },
  {
    type: 'cssMediaEnum',
    key: 'colorGamut',
    title: 'Color gamut',
    mediaName: 'color-gamut',
    mediaValues: ['srgb', 'p3', 'rec2020'], // rec2020 includes p3 and p3 includes srgb
  },
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
    key: 'pageAcceptHeader',
    title: 'Accept header for navigation',
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
    key: 'dprHeader',
    title: 'Device pixel ratio',
    resourceType: 'page',
    headerName: 'DPR',
    isClientHint: true,
  },
  {
    type: 'cssMediaNumber',
    key: 'screenWidth',
    title: 'Screen width',
    mediaName: 'device-width',
    // The width and height must have the same breakpoints
    // because they can be swapped to mitigate a changing device orientation
    getRangeBreakpoints: () => getExponentialSequence(320, 2700, 1.1, 10),
    valueUnit: 'px',
  },
  {
    type: 'cssMediaNumber',
    key: 'screenHeight',
    title: 'Screen height',
    mediaName: 'device-height',
    getRangeBreakpoints: () => getExponentialSequence(320, 2700, 1.1, 10),
    valueUnit: 'px',
  },
]

export default signalSources
