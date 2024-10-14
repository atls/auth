import type { Request }                             from 'express'
import type { Response }                            from 'express'
import type { ModuleOptions }                       from 'simple-oauth2'

import type { HydraAuthorizationCodeClientOptions } from './hydra-authorization-code.interfaces.js'
import type { HydraAuthorizationCodeResult }        from './hydra-authorization-code.interfaces.js'
import type { AuthenticationStateOptions }          from './hydra-authorization-code.interfaces.js'
import type { State }                               from './hydra-authorization-code.interfaces.js'

import { AuthorizationCode }                        from 'simple-oauth2'
import { randomBytes }                              from 'crypto'
import cookie                                       from 'cookie'

import { serializeState }                           from './state.utils.js'
import { parseState }                               from './state.utils.js'

export class HydraAuthorizationCodeClient {
  static NONCE_TOKEN = 'anonce'

  logoutUrl: string

  private client: AuthorizationCode

  private redirectUri: string

  private scope: Array<string>

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

  getReturnToUrl(req: Request): string | undefined {
    const query = req.query || req.params

    if (query.return_to) {
      return query.return_to as string
    }

    const referrer = req.get('referrer')
    const host = req.get('host')

    if (referrer && host && referrer.includes(host)) {
      const referrerUrl = new URL(referrer)

      return referrerUrl.pathname
    }

    return undefined
  }

  setNonce(req: Request, res: Response, nonce: string): void {
    let setCookieHeader = req.get('Set-Cookie') || ([] as Array<string>)

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

  getAuthorizationUrl(params = {}): string {
    const state = serializeState(params)

    return this.client.authorizeURL({
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state,
    })
  }

  authenticate(req: Request, res: Response, options: AuthenticationStateOptions = {}): void {
    const params = {
      ...options,
      // eslint-disable-next-line react/no-is-mounted
      returnTo: this.getReturnToUrl(req),
      nonce: randomBytes(20).toString('hex'),
    }

    // eslint-disable-next-line react/no-is-mounted
    this.setNonce(req, res, params.nonce)

    // eslint-disable-next-line react/no-is-mounted
    res.redirect(this.getAuthorizationUrl(params))
  }

  async verify(req: Request, res: Response): Promise<HydraAuthorizationCodeResult> {
    const query = req.query || req.params

    const tokenConfig = {
      redirect_uri: this.redirectUri,
      code: query.code as string,
      scope: query.scope as string,
    }

    // @ts-expect-error
    const state: State = parseState(query.state) || {}

    // @ts-expect-error
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
