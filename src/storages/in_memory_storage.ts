import { SignalCollection, Storage, VisitInfo } from '../common_types'
import { makeVisitId } from '../utils'
import { getFingerprint } from '../signal_sources'

export default class InMemoryStorage implements Storage {
  private visits = new Map<
    string,
    {
      visitorIp: string
      visitorUserAgent: string
      signals: SignalCollection
      createdAt: Date
      finalizedAt?: Date
    }
  >()

  public async createVisit(visitorIp: string, visitorUserAgent: string): Promise<string> {
    let visitId: string
    do {
      visitId = makeVisitId()
    } while (this.visits.has(visitId))
    this.visits.set(visitId, {
      visitorIp,
      visitorUserAgent,
      createdAt: new Date(),
      signals: {},
    })
    return visitId
  }

  public async addSignals(visitId: string, signals: Readonly<SignalCollection>): Promise<void> {
    const visit = this.visits.get(visitId)
    if (visit && !visit.finalizedAt) {
      Object.assign(visit.signals, signals)
    }
  }

  public async finalizeAndGetVisit(visitId: string, includeSignals = false): Promise<Readonly<VisitInfo> | undefined> {
    const visit = this.visits.get(visitId)
    if (!visit) {
      return undefined
    }
    if (!visit.finalizedAt) {
      visit.finalizedAt = new Date()
    }
    const signals = { ...visit.signals }
    return {
      finalizedAt: visit.finalizedAt,
      get fingerprint() {
        return getFingerprint(signals)
      },
      signals: includeSignals ? signals : {},
    }
  }
}
