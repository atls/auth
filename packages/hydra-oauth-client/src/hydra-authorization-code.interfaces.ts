import type { AccessToken } from 'simple-oauth2'

export type StateTargetType = 'login' | 'recovery' | 'registration' | 'verification'

export interface State {
  nonce?: string
  returnTo?: string
  target?: StateTargetType
}

export interface AuthenticationStateOptions {
  target?: StateTargetType
}

export interface HydraAuthorizationCodeClientOptions {
  clientId: string
  clientSecret: string
  tokenHost: string
  redirectUri: string
  scope?: Array<string>
}

export interface HydraAuthorizationCodeResult {
  accessToken: AccessToken
  state: Omit<State, 'nonce'>
}
