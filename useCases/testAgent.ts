import { Chat, User } from '@prisma/client'
import { db } from '../lib/db'
import { chat as chatMessage } from '../src/shared/services/gpt'
import { createNewConversation } from '../src/shared/services/history'

export interface ITestAgent {
  query: string
  phone: string
}

export const testAgent = async ({ query, phone }: ITestAgent) => {
  try {
    let chat: Chat
    let user: User
    const userData = await db.user.findFirst({
      where: {
        contactNumber: phone,
      },
    })

    if (userData) {
      user = userData

      const chatData = await db.chat.findFirst({
        where: {
          userId: userData?.id,
        },
      })

      if (!chatData) {
        const newChat = await db.chat.create({
          data: {
            userId: userData?.id,
          },
        })
        chat = newChat
      } else {
        chat = chatData
      }
    } else {
      const newUser = await db.user.create({
        data: {
          name: 'user test',
          contactNumber: phone,
        },
      })
      user = newUser

      const chatData = await db.chat.findFirst({
        where: {
          userId: user?.id,
        },
      })

      if (!chatData) {
        const newChat = await db.chat.create({
          data: {
            userId: newUser?.id,
          },
        })
        chat = newChat
      } else {
        chat = chatData
      }
    }
    const answer = await chatMessage({
      query,
      chatId: chat?.id,
      audioRequested: false,
    })

    await createNewConversation({
      userMessage: query,
      aiMessage: answer,
      chatId: chat?.id,
      audio: false,
    })

    return answer
  } catch (err) {
    console.log(err)
  }
}
