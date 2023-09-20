import cookie                                  from 'cookie'
import { AuthorizationCode }                   from 'simple-oauth2'
import { ModuleOptions }                       from 'simple-oauth2'
import { randomBytes }                         from 'crypto'

import { HydraAuthorizationCodeClientOptions } from './hydra-authorization-code.interfaces'
import { HydraAuthorizationCodeResult }        from './hydra-authorization-code.interfaces'
import { AuthenticationStateOptions }          from './hydra-authorization-code.interfaces'
import { State }                               from './hydra-authorization-code.interfaces'
import { serializeState }                      from './state.utils'
import { parseState }                          from './state.utils'

export class HydraAuthorizationCodeClient {
  static NONCE_TOKEN = 'anonce'

  private client: AuthorizationCode

  private redirectUri: string

  private scope: string[]

  logoutUrl: string

  constructor(options: HydraAuthorizationCodeClientOptions) {
    const credentials: ModuleOptions = {
      client: {
        id: options.clientId,
        secret: options.clientSecret,
      },
      auth: {
        tokenHost: options.tokenHost,
        authorizePath: '/oauth2/auth',
        tokenPath: '/oauth2/token',
      },
      options: {
        bodyFormat: 'form',
        authorizationMethod: 'body',
      },
    }

    this.client = new AuthorizationCode(credentials)
    this.redirectUri = options.redirectUri
    this.scope = options.scope || ['openid', 'offline']
    this.logoutUrl = new URL('/oauth2/sessions/logout', options.tokenHost).toString()
  }

  getReturnToUrl(req): string | undefined {
    const query = req.query || req.params

    if (query.return_to) {
      return query.return_to
    }

    const referrer = req.get('referrer')
    const host = req.get('host')

    if (referrer && host && referrer.includes(host)) {
      const referrerUrl = new URL(referrer)

      return referrerUrl.pathname
    }

    return undefined
  }

  setNonce(req, res, nonce: string) {
    let setCookieHeader = req.get('Set-Cookie') || []

    if (!Array.isArray(setCookieHeader)) {
      setCookieHeader = [setCookieHeader]
    }

    setCookieHeader.push(
      cookie.serialize(HydraAuthorizationCodeClient.NONCE_TOKEN, nonce, {
        expires: new Date(Date.now() + 60 * 60 * 24),
        maxAge: 60 * 60 * 24,
        httpOnly: true,
      })
    )

    res.set('Set-Cookie', setCookieHeader)
  }

  getAuthorizationUrl(params = {}) {
    const state = serializeState(params)

    return this.client.authorizeURL({
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state,
    })
  }

  authenticate(req, res, options: AuthenticationStateOptions = {}) {
    const params = {
      ...options,
      returnTo: this.getReturnToUrl(req),
      nonce: randomBytes(20).toString('hex'),
    }

    this.setNonce(req, res, params.nonce)

    return res.redirect(this.getAuthorizationUrl(params))
  }

  async verify(req, res): Promise<HydraAuthorizationCodeResult> {
    const query = req.query || req.params

    const tokenConfig = {
      redirect_uri: this.redirectUri,
      code: query.code,
      scope: query.scope,
    }

    const state: State = parseState(query.state) || {}

    const cookies = cookie.parse(req.get('cookie'))

    if (state.nonce !== cookies[HydraAuthorizationCodeClient.NONCE_TOKEN]) {
      throw new Error('Nonce not mutch')
    }

    // TODO: rename to token
    const accessToken = await this.client.getToken(tokenConfig)

    return {
      accessToken,
      state,
    }
  }
}
