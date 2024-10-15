import type { Session }         from '@ory/kratos-client'
import type { IncomingMessage } from 'http'
import type { NextApiRequest }  from 'next'

import { Logger }               from '@atls/logger'

import { getKratosClient }      from './get-kratos.client.js'

const logger = new Logger('getKratosSession')

const getCookie = (req: IncomingMessage & NextApiRequest): string | null => {
  if (req.cookies?.ory_kratos_session) {
    return `ory_kratos_session=${req.cookies.ory_kratos_session}`
  }

  if (req.headers?.cookie?.includes('ory_kratos_session')) {
    return req.headers.cookie
  }

  return null
}

export const getKratosSession = async (
  req: IncomingMessage & NextApiRequest
): Promise<Session | null> => {
  const cookie = getCookie(req)
  const authorization = req.headers?.authorization

  if (cookie || authorization) {
    try {
      const kratos = getKratosClient()

      // @ts-expect-error
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
