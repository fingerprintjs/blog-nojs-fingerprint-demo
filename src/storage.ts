import { makeVisitId } from './utils'
import { SignalCollection } from './common_types'
import { getFingerprint } from './signal_sources'

export interface VisitInfo {
  /** When the fingerprint was calculated */
  finalizedAt: Date
  /** The list of signals associated with the visit */
  signals: Readonly<SignalCollection>
  /** The fingerprint derived from the signals */
  fingerprint: string
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
  createVisit(): Promise<string>

  /**
   * Adds signals to a visit.
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

export class InMemoryStorage implements Storage {
  private visits = new Map<
    string,
    {
      createdAt: Date
      finalizedAt?: Date
      signals: SignalCollection
    }
  >()

  public async createVisit(): Promise<string> {
    let visitId: string
    do {
      visitId = makeVisitId()
    } while (this.visits.has(visitId))
    this.visits.set(visitId, {
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

// todo: Consider making a DB storage
