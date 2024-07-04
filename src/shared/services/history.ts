import { db } from '../../../lib/db'

interface AddMessageToConversationProps {
  chatId: string
  userMessage: string
  aiMessage: string
  audio: boolean
}

export async function createNewConversation({
  chatId,
  aiMessage,
  userMessage,
  audio,
}: AddMessageToConversationProps) {
  try {
    const newConversation = await db.conversation.create({
      data: {
        ia: aiMessage,
        user: userMessage,
        audio,
        chatId,
      },
    })

    await db.chat.update({
      where: {
        id: chatId,
      },
      data: {
        unreadMessages: {
          increment: 1,
        },
      },
    })

    return newConversation
  } catch (error) {
    console.error('Create new conversation Error:', error)
    throw error
  }
}

export async function deleteUser(userId: string) {
  try {
    const userData = await db.user.findFirst({
      where: {
        id: userId,
      },
    })

    if (userData) {
      const chat = await db.chat.findFirst({
        where: {
          userId: userData?.id,
        },
      })

      await db.conversation.deleteMany({
        where: {
          chatId: chat?.id,
        },
      })

      await db.chat.delete({
        where: {
          id: chat?.id,
        },
      })

      await db.user.delete({
        where: {
          id: userData?.id,
        },
      })
    }
  } catch (err) {
    console.log(err)
  }
}

// ;(async () => {
//   await deleteUser('668445186f64a6765f44fc1f')
// })()
