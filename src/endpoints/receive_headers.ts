import { SignalCollection, Storage } from '../storage'
import signalSources from '../signal_sources'

/**
 * Saves HTTP request headers as the visit signals
 */
export default async function receiveHeaders(
  storage: Storage,
  visitId: string,
  resourceType: string,
  getHeader: (name: string) => string | undefined,
): Promise<void> {
  const signals: SignalCollection = {}

  for (const signalSource of signalSources) {
    if (signalSource.type === 'httpHeader' && signalSource.resourceType === resourceType) {
      const headerValue = getHeader(signalSource.headerName)
      if (headerValue !== undefined) {
        signals[signalSource.key] = signalSource.getSignificantPart?.(headerValue) ?? headerValue
      }
    }
  }

  if (Object.keys(signals).length) {
    await storage.addSignals(visitId, signals)
  }
}
