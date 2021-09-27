/**
 * A collection of signals.
 * A signal is a piece of information associated with a visit. Signals are used to identify the visit.
 *
 * The keys are the signal keys.
 * They are unique within a visit. If a new signal with the same key is given, the value will be overwritten.
 * The key order is random and gives no information.
 *
 * The values are the signal values (plain strings).
 */
export type SignalCollection = Record<string, string>

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
