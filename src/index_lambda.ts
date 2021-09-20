import expressToLambda from '@vendia/serverless-express'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import initApp from './app'

const handlerInitPromise = initApp().then((app) => expressToLambda({ app }))

export const handler: APIGatewayProxyHandlerV2 = async (event, context, callback) => {
  const expressHandler = await handlerInitPromise
  return expressHandler(event, context, callback)
}
