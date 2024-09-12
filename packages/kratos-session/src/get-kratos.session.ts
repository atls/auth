import type { NextApiRequest } from 'next'

import { Logger }              from '@atls/logger'
import { Session }             from '@ory/kratos-client'
import { IncomingMessage }     from 'http'

import { getKratosClient }     from './get-kratos.client'

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

      const { data: session } = await kratos.whoami(cookie, authorization)

      if (session) {
        logger.debug(session)

        return session
      }
    } catch (error) {
      logger.error(error)
    }
  }

  return null
}
