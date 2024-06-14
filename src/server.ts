import fastify from 'fastify'
import { receiveMessage } from './services/twilio'

const app = fastify()

app.post('/message', async (request, reply) => {
  // console.log(request.body)
  console.log('ENTROUUUU!!!')
  receiveMessage()
  reply.code(200).send({ success: true, message: 'Recebido com sucesso' })
})

app.get('/health', async () => {
  return { status: 'ok' }
})

app
  .listen({
    host: '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 80,
  })
  .then(() => {
    console.log('HTTP Server running...')
  })
