import { State } from './hydra-authorization-code.interfaces'

export const serializeState = (state: State) =>
  Buffer.from(JSON.stringify(state)).toString('base64')

export const parseState = (state: string): State | null => {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString())
  } catch {
    // TODO: log error

    return null
  }
}
