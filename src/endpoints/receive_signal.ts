import { Storage } from '../common_types'
import signalSources from '../signal_sources'

/**
 * Handles requests that browsers send when a signal activates.
 * Once a request arrives, the handler assiciates the signal with the visit.
 */
export default async function receiveSignal(
  storage: Storage,
  visitId: string,
  signalKey: string,
  signalValue: string,
): Promise<void> {
  const signalSource = signalSources.find((source) => source.key === signalKey)
  switch (signalSource?.type) {
    case 'css':
    case 'fontAbsence':
      await storage.addSignals(visitId, { [signalSource.key]: '' })
      return
    case 'cssMediaEnum':
      if (signalSource.mediaValues.includes(signalValue)) {
        await storage.addSignals(visitId, { [signalSource.key]: signalValue })
      }
      return
    case 'cssMediaNumber':
      if (/^(\d+(\.\d+)?)?,(\d+(\.\d+)?)?$/.test(signalValue) && signalValue !== ',') {
        await storage.addSignals(visitId, { [signalSource.key]: signalValue })
      }
      return
  }
}
