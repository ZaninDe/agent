import { User } from '@prisma/client'
import { db } from '../lib/db'
import { STT } from '../src/shared/services/voices/stt'
import { createNewConversation } from '../src/shared/services/history'
import {
  sendAudioMessage,
  sendTextMessage,
} from '../src/shared/services/twilio'
import { chat, isAudioRequested } from '../src/shared/services/gpt'
import { authorizedUsers } from '../src/utils/constants/data'

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
      chatId = newChat.id
    } else {
      chatId = chatData.id
    }

    const answerWithAudio = await isAudioRequested(query)

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
    })
  } catch (err) {
    console.log(err)
  }
}
