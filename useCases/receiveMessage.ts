import { User } from '@prisma/client'
import { db } from '../lib/db'
import { chat } from '../src/gpt'
import { sendMessage } from '../src/services/twilio'
import { createNewConversation } from '../src/services/history'
import { STT } from '../src/shared/utils/stt'

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

    const answer = await chat({
      query,
      chatId,
    })

    await sendMessage({ from, content: answer })
    await createNewConversation({
      userMessage: body,
      aiMessage: answer,
      chatId,
      audio: false,
    })
  } catch (err) {
    console.log(err)
  }
}
