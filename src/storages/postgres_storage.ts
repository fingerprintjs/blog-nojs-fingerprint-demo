import * as pg from 'pg'
import { makeVisitId } from '../utils'
import { SignalCollection, Storage, VisitInfo } from '../common_types'
import { getFingerprint } from '../signal_sources'

interface VisitRow {
  id: number
  public_id: string
  fingerprint: string | null
  visitor_id: string
  visitor_user_agent: string
  created_at: Date
  finalized_at: Date | null
}

interface VisitSignalRow {
  id: number
  visit_id: number
  key: string
  value: string
  created_at: Date
}

const visitIdMaxLength = 32
const visitorUserAgentMaxLength = 300
const signalValueMaxLength = 250

export default class PostgresStorage implements Storage {
  constructor(private pool: pg.Pool) {}

  public async createVisit(visitorIp: string, visitorUserAgent: string): Promise<string> {
    const client = await this.pool.connect()
    try {
      let visitId: string
      for (;;) {
        visitId = makeVisitId()
        const result = await client.query('SELECT id FROM visits WHERE public_id = $1', [
          visitId.slice(0, visitIdMaxLength),
        ])
        if (result.rowCount === 0) {
          break
        }
      }

      client.query('INSERT INTO visits (public_id, visitor_ip, visitor_user_agent) VALUES ($1, $2, $3)', [
        visitId.slice(0, visitIdMaxLength),
        visitorIp,
        visitorUserAgent.slice(0, visitorUserAgentMaxLength),
      ])

      return visitId
    } finally {
      client.release()
    }
  }

  public async addSignals(visitId: string, signals: Readonly<SignalCollection>): Promise<void> {
    if (Object.keys(signals).length === 0) {
      return
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const visitResponse = await client.query<Pick<VisitRow, 'id' | 'fingerprint'>>(
        // We don't want the visit to be finalized while the new signals arrive, so we lock the row
        'SELECT id, fingerprint FROM visits WHERE public_id = $1 FOR SHARE',
        [visitId.slice(0, visitIdMaxLength)],
      )
      const visitRow = visitResponse.rows[0]

      if (!visitRow || visitRow.fingerprint !== null) {
        await client.query('ROLLBACK')
        return
      }

      // This query relies on the `visit_signals_visit_id_and_key` unique constraint to prevent key duplicates
      await client.query(...buildQueryForAddingSignals(visitRow.id, signals))

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  public async finalizeAndGetVisit(visitId: string, includeSignals?: boolean): Promise<VisitInfo | undefined> {
    let visitDbId: number
    let finalizedAt: Date
    let fingerprint: string
    let signals: SignalCollection | undefined

    const client = await this.pool.connect()
    try {
      try {
        await client.query('BEGIN')

        const visitResponse = await client.query<Pick<VisitRow, 'id' | 'fingerprint' | 'finalized_at'>>(
          // We don't the visit to be finalized during the finalization, so we lock the row
          'SELECT id, fingerprint, finalized_at FROM visits WHERE public_id = $1 FOR UPDATE',
          [visitId.slice(0, visitIdMaxLength)],
        )
        const visitRow = visitResponse.rows[0]

        if (!visitRow) {
          await client.query('ROLLBACK')
          return undefined
        }

        visitDbId = visitRow.id

        if (visitRow.fingerprint !== null && visitRow.finalized_at !== null) {
          fingerprint = visitRow.fingerprint
          finalizedAt = visitRow.finalized_at
        } else {
          // We don't want new signals to arrive during the finalization
          // This lock goes after the the visit lock to avoid a deadlock with the `addSignals` method
          await client.query('LOCK visit_signals IN ACCESS SHARE MODE')

          signals = await getVisitSignals(client, visitRow.id)
          fingerprint = getFingerprint(signals)
          finalizedAt = new Date()

          await client.query('UPDATE visits SET fingerprint = $1, finalized_at = $2 WHERE id = $3', [
            fingerprint,
            finalizedAt,
            visitRow.id,
          ])
        }

        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }

      return {
        finalizedAt,
        fingerprint,
        signals: includeSignals ? signals || (await getVisitSignals(client, visitDbId)) : {},
      }
    } finally {
      client.release()
    }
  }
}

function buildQueryForAddingSignals(visitDbId: number, signals: Readonly<SignalCollection>) {
  const signalEntries = Object.entries(signals)
  const rowValuesSql = new Array<string>(signalEntries.length)
  const parameters = new Array<unknown>(signalEntries.length * 3)

  for (let i = 0; i < signalEntries.length; ++i) {
    const [key, value] = signalEntries[i]
    rowValuesSql[i] = `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`
    parameters[i * 3] = visitDbId
    parameters[i * 3 + 1] = key
    parameters[i * 3 + 2] = value.slice(0, signalValueMaxLength)
  }

  // This query relies on the `visit_signals_visit_id_and_key` unique constraint to prevent key duplicates
  return [
    `
INSERT INTO visit_signals (visit_id, key, value) VALUES ${rowValuesSql.join(', ')}
ON CONFLICT (visit_id, key) DO UPDATE SET value = excluded.value
`,
    parameters,
  ] as const
}

async function getVisitSignals(client: pg.PoolClient, visitDbId: number): Promise<SignalCollection> {
  const response = await client.query<Pick<VisitSignalRow, 'key' | 'value'>>(
    'SELECT key, value FROM visit_signals WHERE visit_id = $1',
    [visitDbId],
  )

  const signals: SignalCollection = {}
  for (const { key, value } of response.rows) {
    signals[key] = value
  }
  return signals
}
