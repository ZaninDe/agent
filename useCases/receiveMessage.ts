import { User } from '@prisma/client'
import { db } from '../lib/db'
import { chat } from '../src/gpt'
import { sendMessage } from '../src/services/twilio'
import { createNewConversation } from '../src/services/history'

interface ReceiveMessage {
  from: string
  body: string
  profileName: string
}

export const receiveMessage = async ({
  from,
  body,
  profileName,
}: ReceiveMessage) => {
  try {
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

    console.log('USER: ', user)

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
      query: body,
      from,
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
