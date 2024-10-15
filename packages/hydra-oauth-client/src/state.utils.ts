import type { State } from './hydra-authorization-code.interfaces.js'

export const serializeState = (state: State): string =>
  Buffer.from(JSON.stringify(state)).toString('base64')

export const parseState = (state: string): State | null => {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString()) as State
  } catch {
    // TODO: log error

    return null
  }
}
