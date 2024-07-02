/* eslint-disable @typescript-eslint/ban-ts-comment */
import fastify from 'fastify'
import formbody from '@fastify/formbody'
import { receiveMessage } from '../../../../useCases/receiveMessage'
import { connectToRedis, disconnectFromRedis } from '../../../redis-store'
import { manageAgent } from '../../../../useCases/manageAgent'

const app = fastify()
app.register(formbody)

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
  MediaUrl0?: string
}

let countProcess = 0

app.post('/message', async (request, reply) => {
  countProcess++
  try {
    console.log('Mensagem recebida...')
    await connectToRedis()
    const body = request.body as TwilioRequestBody
    if (body.From) {
      await receiveMessage({
        from: body.From,
        body: body.Body,
        profileName: body.ProfileName,
        messageSid: body.MessageSid,
        medialUrl: body.MediaUrl0,
      })
    }
    return reply
      .code(200)
      .send({ success: true, message: 'Recebido com sucesso' })
  } catch (error) {
    app.log.error(error)
    reply.code(500).send({ success: false, message: 'Erro no servidor' })
  } finally {
    countProcess--

    if (countProcess === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await disconnectFromRedis()
    }
  }
})

app.put('/manage-agent/:chatId', async (request, reply) => {
  // @ts-ignore
  const { chatId } = request.params
  try {
    await manageAgent({ chatId })

    return reply.status(201).send({ success: 'status alterado com sucesso!' })
  } catch (error) {
    app.log.error(error)
    return reply
      .status(500)
      .send({ error: 'Ocorreu um erro ao atualizar o status do agente' })
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
