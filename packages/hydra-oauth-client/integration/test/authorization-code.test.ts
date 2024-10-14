/**
 * @jest-environment node
 */

import type { Express }                 from 'express'
import type { Server }                  from 'http'
import type { SuperTest }               from 'supertest'
import type { Test }                    from 'supertest'

import { describe }                     from '@jest/globals'
import { afterAll }                     from '@jest/globals'
import { beforeAll }                    from '@jest/globals'
import { expect }                       from '@jest/globals'
import { it }                           from '@jest/globals'
import express                          from 'express'
import getPort                          from 'get-port'
import supertest                        from 'supertest'

import { HydraAuthorizationCodeClient } from '../../src/index.js'

describe('authorization code', () => {
  let app: Express
  let server: Server
  let request: SuperTest<Test>

  beforeAll(async () => {
    const port = await getPort()

    app = express()

    const client = new HydraAuthorizationCodeClient({
      clientId: 'client',
      clientSecret: 'secret',
      tokenHost: `http://localhost:${port}`,
      redirectUri: `http://localhost:${port}/callback`,
    })

    app.use('/login', (req, res) => {
      client.authenticate(req, res)
    })
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.use('/callback', async (req, res): Promise<void> => {
      res.json(await client.verify(req, res))
    })

    app.use('/oauth2/token', (req, res) => res.json({ access_token: true }))

    server = app.listen(port)
    // @ts-expect-error
    request = supertest.agent(server)
  })

  afterAll(() => {
    server.close()
  })

  it('authenticate location', async () => {
    const response = await request.get('/login')

    const location = new URL(response.get('location')!)

    expect(location.searchParams.get('client_id')).toBe('client')
    expect(location.searchParams.get('response_type')).toBe('code')
  })

  it('authenticate nonce', async () => {
    const response = await request.get('/login')

    // @ts-expect-error
    const cookies = response.get('set-cookie') as Array<string>

    if (!cookies) throw new Error('No cookies')

    const nonce = cookies.find((item) => item.includes(HydraAuthorizationCodeClient.NONCE_TOKEN))

    expect(nonce).toBeDefined()
  })

  it('verify', async () => {
    const authenticate = await request.get('/login')

    const location = new URL(authenticate.get('location')!)

    const verify = await request.get('/callback').query({
      state: location.searchParams.get('state'),
      scope: 'openid offline',
      code: 'code',
    })

    expect(verify.body.accessToken).toBeDefined()
  })
})
