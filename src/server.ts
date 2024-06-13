import fastify from 'fastify'
import { receiveMessage } from './services/twilio'

const app = fastify()

app.post('/message', async (request) => {
  console.log(request.body)
  receiveMessage()
  return { hello: 'world' }
})

app.get('/health', async () => {
  return { status: 'ok' }
})

app
  .listen({
    host: '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 3333,
  })
  .then(() => {
    console.log('HTTP Server running...')
  })
