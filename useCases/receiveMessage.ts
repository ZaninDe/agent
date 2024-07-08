import { User } from '@prisma/client'
import { db } from '../lib/db'
import { STT } from '../src/shared/services/voices/stt'
import { createNewConversation } from '../src/shared/services/history'
import {
  sendAudioMessage,
  sendTextMessage,
} from '../src/shared/services/twilio'
import { chat, isAudioRequested, isBlockWall } from '../src/shared/services/gpt'
import { authorizedUsers } from '../src/utils/constants/data'
import { pusherServer } from '../lib/pusher'

interface ReceiveMessage {
  from: string
  body: string
  profileName: string
  messageSid: string
  medialUrl?: string
}

export const receiveMessage = async ({
  from,
  body,
  profileName,
  messageSid,
  medialUrl,
}: ReceiveMessage) => {
  try {
    let query = body
    if (medialUrl && medialUrl.startsWith('https://api.twilio.com/')) {
      const text = await STT({ messageSid, mediaUrl0: medialUrl })
      query = text
      console.log('TRANSCRIPTION: ', text)
    }
    let chatId = ''
    let user: User | undefined
    const ExistingUser = await db.user.findFirst({
      where: {
        contactNumber: from,
      },
    })

    if (!ExistingUser) {
      const auth = authorizedUsers.find(
        (authorizedUser) => authorizedUser === from,
      )

      if (!auth) {
        await sendTextMessage({
          to: from,
          content: `${profileName}, sinto muito! No momento não encontramos seu nome na lista de usuários. Saiba mais em https://www.adbat.com.br`,
        })
        return
      }
      const newUser = await db.user.create({
        data: {
          name: profileName,
          contactNumber: from,
        },
      })
      user = newUser
    } else {
      user = ExistingUser
    }

    const chatData = await db.chat.findFirst({
      where: {
        user,
      },
    })

    if (!chatData) {
      const newChat = await db.chat.create({
        data: {
          userId: user.id,
        },
      })

      pusherServer.trigger('chat-channel', 'new-chat', {
        chatId,
      })
      chatId = newChat.id
    } else {
      chatId = chatData?.id
      console.log('checando status do agente...')
      if (chatData?.agentIsActive === false) {
        console.log('agent is off...')
        await createNewConversation({
          chatId: chatData?.id,
          iaAnswer: false,
          aiMessage: 'off',
          audio: false,
          userMessage: body,
        })
        return
      }
    }

    const answerWithAudio = await isAudioRequested(query)

    const isBlockWallMessage = await isBlockWall(query)

    if (isBlockWallMessage) {
      console.log('Mensagem bloqueante identificada!')
      await db.chat.update({
        where: {
          id: chatId,
        },
        data: {
          agentIsActive: false,
          isAlert: true,
        },
      })
      const content = 'Aguarde um momento, por favor...'

      await sendTextMessage({ to: from, content })

      await createNewConversation({
        userMessage: query,
        iaAnswer: true,
        aiMessage: content,
        chatId,
        audio: false,
      })
      return
    }

    const answer = await chat({
      query,
      chatId,
      audioRequested: answerWithAudio,
    })

    if (answerWithAudio) {
      sendAudioMessage({ to: from, content: answer, messageSid })
    } else {
      await sendTextMessage({ to: from, content: answer })
    }
    await createNewConversation({
      userMessage: body,
      aiMessage: answer,
      chatId,
      audio: answerWithAudio,
      iaAnswer: true,
    })
  } catch (err) {
    console.log(err)
  }
}
