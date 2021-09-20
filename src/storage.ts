import { makeVisitId } from './utils'

/**
 * A piece of information associated with a visit. Used to identify the visit.
 */
export interface Signal {
  /**
   * The signal key.
   * It's unique within a visit. If a new signal with the same key is given, the value will be overwritten.
   */
  key: string
  /**
   * The signal value
   */
  value: string
}

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
  addSignals(visitId: string, signals: readonly Readonly<Signal>[]): Promise<void>

  /**
   * Prohibits future changes of a visit including adding signals
   */
  finalize(visitId: string): Promise<void>

  /**
   * Gets the signals associated with a visit
   */
  getSignals(visitId: string): Promise<readonly Readonly<Signal>[] | undefined>
}

export class InMemoryStorage implements Storage {
  private visits = new Map<
    string,
    {
      createdAt: Date
      isFinalized: boolean
      signals: Map<string, string>
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
      signals: new Map(),
    })
    if (isFinite(lifetimeMs)) {
      setTimeout(() => this.visits.delete(visitId), lifetimeMs)
    }
    return visitId
  }

  public async addSignals(visitId: string, signals: readonly Readonly<Signal>[]): Promise<void> {
    const visit = this.visits.get(visitId)
    if (visit && !visit.isFinalized) {
      for (const { key, value } of signals) {
        visit.signals.set(key, value)
      }
    }
  }

  public async finalize(visitId: string): Promise<void> {
    const visit = this.visits.get(visitId)
    if (visit) {
      visit.isFinalized = true
    }
  }

  public async getSignals(visitId: string): Promise<Signal[] | undefined> {
    const visit = this.visits.get(visitId)
    if (!visit) {
      return undefined
    }
    const signals = new Array<Signal>(visit.signals.size)
    let index = 0
    for (const [key, value] of visit.signals) {
      signals[index++] = { key, value }
    }
    return signals
  }
}

// todo: Consider making a DB storage
