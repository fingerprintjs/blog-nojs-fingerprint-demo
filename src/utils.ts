import express from 'express'

const idAlphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function makeVisitId(length = 16): string {
  let id = ''
  for (let i = 0; i < length; ++i) {
    id += idAlphabet[Math.floor(Math.random() * idAlphabet.length)]
  }
  return id
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export interface HttpResponse {
  body: string
  status?: number
  headers?: Record<string, string>
}

export function responseToExpress(expressResponse: express.Response, responseData: HttpResponse): void {
  if (responseData.status) {
    expressResponse.status(responseData.status)
  }
  if (responseData.headers) {
    for (const [name, value] of Object.entries(responseData.headers)) {
      expressResponse.setHeader(name, value)
    }
  }
  expressResponse.send(responseData.body)
}

export function round(value: number, base = 1): number {
  if (Math.abs(base) >= 1) {
    return Math.round(value / base) * base
  } else {
    // Sometimes when a number is multiplied by a small number, precision is lost,
    // for example 1234 * 0.0001 === 0.12340000000000001, and it's more precise divide: 1234 / (1 / 0.0001) === 0.1234.
    const counterBase = 1 / base
    return Math.round(value * counterBase) / counterBase
  }
}

export function* getExponentialSequence(
  min: number,
  max: number,
  stepMultiplier: number,
  roundBase = 1,
): Generator<number, void> {
  let previousYield: number | undefined

  for (let i = 0; ; ++i) {
    const toYield = round(min * stepMultiplier ** i, roundBase)
    if (toYield > max) {
      break
    }
    if (toYield !== previousYield) {
      previousYield = toYield
      yield toYield
    }
  }
}

export function toCamelCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word, index) => word.slice(0, 1)[index === 0 ? 'toLowerCase' : 'toUpperCase']() + word.slice(1).toLowerCase())
    .join('')
}
