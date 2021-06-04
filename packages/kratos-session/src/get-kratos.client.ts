import { Configuration } from '@ory/kratos-client'
import { PublicApi }     from '@ory/kratos-client'

let kratos

export const getKratosClient = () => {
  if (!kratos) {
    kratos = new PublicApi(new Configuration({ basePath: process.env.KRATOS_PUBLIC_URL }))
  }

  return kratos
}
