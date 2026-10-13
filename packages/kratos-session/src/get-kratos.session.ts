import type { Session }         from '@ory/kratos-client'
import type { IncomingMessage } from 'node:http'

import { Logger }               from '@atls/logger'

import { getKratosClient }      from './get-kratos.client.js'

const logger = new Logger('getKratosSession')

type SessionRequest = IncomingMessage & {
  cookies?: Partial<Record<string, string>>
}

const getCookie = (req: SessionRequest): string | null => {
  if (req.cookies?.ory_kratos_session) {
    return `ory_kratos_session=${req.cookies.ory_kratos_session}`
  }

  if (req.headers.cookie?.includes('ory_kratos_session')) {
    return req.headers.cookie
  }

  return null
}

export const getKratosSession = async (req: SessionRequest): Promise<Session | null> => {
  const cookie = getCookie(req)
  const { authorization } = req.headers

  if (cookie || authorization) {
    try {
      const kratos = getKratosClient()

      // @ts-expect-error: SDK 0.6.3 has no declared whoami method
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const { data: session } = await kratos.whoami(cookie, authorization)

      if (session) {
        logger.debug(session)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return session
      }
    } catch (error) {
      logger.error(error)
    }
  }

  return null
}
