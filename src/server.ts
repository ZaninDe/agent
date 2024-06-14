import fastify from 'fastify'
import fastifyFormBody from '@fastify/formbody'
import { receiveMessage } from './services/twilio'
import { parse } from 'dotenv'

const app = fastify()
app.register(fastifyFormBody, { parser: (str) => parse(str) })

app.post('/message', async (request, reply) => {
  try {
    console.log('ENTROUUUU!!!')
    console.log('Request Body:', request.body)
    await receiveMessage()
    reply.code(200).send({ success: true, message: 'Recebido com sucesso' })
  } catch (error) {
    app.log.error(error)
    reply.code(500).send({ success: false, message: 'Erro no servidor' })
  }
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
