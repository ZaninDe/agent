import { Chat, User } from '@prisma/client'
import { db } from '../lib/db'
import { chat as chatMessage, isBlockWall } from '../src/shared/services/gpt'
import { createNewConversation } from '../src/shared/services/history'
import { pusherServer } from '../lib/pusher'
import { sendTextMessage } from '../src/shared/services/twilio'

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
        pusherServer.trigger('chat-channel', 'new-chat', {
          chatId: newChat?.id,
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

        pusherServer.trigger('chat-channel', 'new-chat', {
          chatId: newChat?.id,
        })
        chat = newChat
      } else {
        chat = chatData
      }
    }

    const isBlockWallMessage = await isBlockWall(query)

    if (isBlockWallMessage) {
      console.log('Mensagem bloqueante identificada!')
      await db.chat.update({
        where: {
          id: chat?.id,
        },
        data: {
          agentIsActive: false,
          isAlert: true,
        },
      })

      const content = 'Aguarde um momento, por favor...'

      await sendTextMessage({ to: phone, content })

      await createNewConversation({
        userMessage: query,
        aiMessage: content,
        chatId: chat?.id,
        audio: false,
      })
      return
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
