import type { Express }                 from 'express'
import type { Server }                  from 'node:http'

import assert                           from 'node:assert/strict'
import { after }                        from 'node:test'
import { before }                       from 'node:test'
import { describe }                     from 'node:test'
import { it }                           from 'node:test'

import express                          from 'express'
import getPort                          from 'get-port'
import supertest                        from 'supertest'

import { HydraAuthorizationCodeClient } from '../../src/index.js'

describe('authorization code', () => {
  let app: Express
  let server: Server
  let request: ReturnType<typeof supertest.agent>

  before(async () => {
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
    app.use('/callback', async (req, res): Promise<void> => {
      res.json(await client.verify(req, res))
    })

    app.use('/oauth2/token', (req, res) => {
      res.json({ access_token: true })
    })

    server = app.listen(port)
    request = supertest.agent(server)
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })

  it('authenticate location', async () => {
    const response = await request.get('/login')
    const locationHeader = response.get('location')

    assert.ok(locationHeader)

    const location = new URL(locationHeader)

    assert.equal(location.searchParams.get('client_id'), 'client')
    assert.equal(location.searchParams.get('response_type'), 'code')
  })

  it('authenticate nonce', async () => {
    const response = await request.get('/login')
    const cookieHeader = response.get('set-cookie')

    assert.ok(cookieHeader)

    const cookies = Array.isArray(cookieHeader) ? (cookieHeader as Array<string>) : [cookieHeader]

    const nonce = cookies.find((item) => item.includes(HydraAuthorizationCodeClient.NONCE_TOKEN))

    assert.ok(nonce)
  })

  it('verify', async () => {
    const authenticate = await request.get('/login')
    const locationHeader = authenticate.get('location')
    const cookieHeader = authenticate.get('set-cookie')

    assert.ok(locationHeader)
    assert.ok(cookieHeader)

    const location = new URL(locationHeader)
    const cookies = Array.isArray(cookieHeader) ? (cookieHeader as Array<string>) : [cookieHeader]
    const verify = await request
      .get('/callback')
      .set('Cookie', cookies)
      .query({
        state: location.searchParams.get('state'),
        scope: 'openid offline',
        code: 'code',
      })

    assert.ok(verify.body.accessToken)
  })
})
