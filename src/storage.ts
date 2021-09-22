import { makeVisitId } from './utils'

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
 * Permanent storage for data like visits and signals
 */
export interface Storage {
  /**
   * Stores a new visit and returns its public identifier.
   * The visit will receive signals to make the visitor identifier.
   * The visit will be removed automatically when `lifetimeMs` pass.
   */
  createVisit(lifetimeMs: number): Promise<string>

  /**
   * Adds signals to a visit.
   * If the visit is finilized or doesn't exist, nothing is added.
   */
  addSignals(visitId: string, signals: Readonly<SignalCollection>): Promise<void>

  /**
   * Prohibits future changes of a visit including adding signals
   */
  finalize(visitId: string): Promise<void>

  /**
   * Gets the signals associated with a visit. Returns `undefined` if there is no visit with the given id.
   */
  getSignals(visitId: string): Promise<Readonly<SignalCollection> | undefined>
}

export class InMemoryStorage implements Storage {
  private visits = new Map<
    string,
    {
      createdAt: Date
      isFinalized: boolean
      signals: SignalCollection
    }
  >()

  public async createVisit(lifetimeMs: number): Promise<string> {
    let visitId: string
    do {
      visitId = makeVisitId()
    } while (this.visits.has(visitId))
    this.visits.set(visitId, {
      createdAt: new Date(),
      isFinalized: false,
      signals: {},
    })
    if (isFinite(lifetimeMs)) {
      setTimeout(() => this.visits.delete(visitId), lifetimeMs)
    }
    return visitId
  }

  public async addSignals(visitId: string, signals: Readonly<SignalCollection>): Promise<void> {
    const visit = this.visits.get(visitId)
    if (visit && !visit.isFinalized) {
      Object.assign(visit.signals, signals)
    }
  }

  public async finalize(visitId: string): Promise<void> {
    const visit = this.visits.get(visitId)
    if (visit) {
      visit.isFinalized = true
    }
  }

  public async getSignals(visitId: string): Promise<SignalCollection | undefined> {
    const visit = this.visits.get(visitId)
    if (!visit) {
      return undefined
    }
    return { ...visit.signals }
  }
}

// todo: Consider making a DB storage
