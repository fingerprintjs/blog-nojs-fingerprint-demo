/**
 * A collection of signals.
 * A signal is a piece of information associated with a visit. Signals are used to identify the visit.
 *
 * The keys are the signal keys. They are unique within a visit. The key order is random and gives no information.
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
  resourceType: 'page' | 'image' | 'style'
  headerName: string
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

export interface VisitInfo {
  /** When the fingerprint was calculated */
  finalizedAt: Date
  /** The fingerprint derived from the signals */
  fingerprint: string
  /** The list of signals associated with the visit */
  signals: Readonly<SignalCollection>
}

/**
 * Permanent storage for data like visits and signals
 */
export interface Storage {
  /**
   * Stores a new visit and returns its public identifier.
   * A visit is a single view of the page that collects the signals.
   * The visit will receive signals to make the visitor identifier.
   */
  createVisit(visitorIp: string, visitorUserAgent: string): Promise<string>

  /**
   * Adds signals to a visit.
   * If a signal with an existing key is given, the value will be overwritten.
   * If the visit is finalized or doesn't exist, nothing is added.
   */
  addSignals(visitId: string, signals: Readonly<SignalCollection>): Promise<void>

  /**
   * Prohibits future changes of a visit, including adding signals, if not prohibited already.
   * Returns the visit data to show to the visitor.
   * Returns `undefined` if there is no visit with the given id.
   */
  finalizeAndGetVisit(visitId: string, includeSignals?: boolean): Promise<Readonly<VisitInfo> | undefined>
}
