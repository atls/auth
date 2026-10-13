import { Configuration } from '@ory/kratos-client'
import { PublicApi }     from '@ory/kratos-client'

let kratos: PublicApi | undefined

export const getKratosClient = (): PublicApi => {
  if (!kratos) {
    kratos = new PublicApi(new Configuration({ basePath: process.env.KRATOS_PUBLIC_URL }))
  }

  return kratos
}
