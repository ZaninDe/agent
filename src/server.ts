import fastify from 'fastify'
import fastifyFormBody from '@fastify/formbody'
import { receiveMessage } from './services/twilio'
import { parse } from 'dotenv'

const app = fastify()
app.register(fastifyFormBody, { parser: (str) => parse(str) })

interface TwilioRequestBody {
  SmsMessageSid: string
  NumMedia: string
  ProfileName: string
  MessageType: string
  SmsSid: string
  WaId: string
  SmsStatus: string
  Body: string
  To: string
  NumSegments: string
  ReferralNumMedia: string
  MessageSid: string
  AccountSid: string
  From: string
  ApiVersion: string
  MediaUrl0?: string // Este campo é opcional
}

app.post('/message', async (request, reply) => {
  try {
    console.log('ENTROUUUU!!!')
    const body = request.body as TwilioRequestBody
    console.log('BODY#####', body)

    await receiveMessage({ from: body.From })
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
