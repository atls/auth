/**
 * @jest-environment node
 */

import { Express }                      from 'express'
import { Server }                       from 'http'
import express                          from 'express'
import getPort                          from 'get-port'
import supertest                        from 'supertest'

import { HydraAuthorizationCodeClient } from '../../src'

describe('authorization code', () => {
  let app: Express
  let server: Server
  let request

  beforeAll(async () => {
    const port = await getPort()

    app = express()

    const client = new HydraAuthorizationCodeClient({
      clientId: 'client',
      clientSecret: 'secret',
      tokenHost: `http://localhost:${port}`,
      redirectUri: `http://localhost:${port}/callback`,
    })

    app.use('/login', (req, res) => client.authenticate(req, res))
    app.use('/callback', async (req, res) => res.json(await client.verify(req, res)))

    app.use('/oauth2/token', (req, res) => res.json({ access_token: true }))

    server = app.listen(port)
    request = supertest.agent(server)
  })

  afterAll(() => {
    server.close()
  })

  it('authenticate location', async () => {
    const response = await request.get('/login')

    const location = new URL(response.get('location'))

    expect(location.searchParams.get('client_id')).toBe('client')
    expect(location.searchParams.get('response_type')).toBe('code')
  })

  it('authenticate nonce', async () => {
    const response = await request.get('/login')

    const nonce = response
      .get('set-cookie')
      .find((item) => item.includes(HydraAuthorizationCodeClient.NONCE_TOKEN))

    expect(nonce).toBeDefined()
  })

  it('verify', async () => {
    const authenticate = await request.get('/login')

    const location = new URL(authenticate.get('location'))

    const verify = await request.get('/callback').query({
      state: location.searchParams.get('state'),
      scope: 'openid offline',
      code: 'code',
    })

    expect(verify.body.accessToken).toBeDefined()
  })
})
