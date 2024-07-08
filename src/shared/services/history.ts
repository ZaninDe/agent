import { db } from '../../../lib/db'
import { pusherServer } from '../../../lib/pusher'

interface AddMessageToConversationProps {
  chatId: string
  userMessage: string
  aiMessage: string
  audio: boolean
  iaAnswer: boolean
}

export async function createNewConversation({
  chatId,
  aiMessage,
  userMessage,
  audio,
  iaAnswer,
}: AddMessageToConversationProps) {
  try {
    const newConversation = await db.conversation.create({
      data: {
        ia: aiMessage,
        user: userMessage,
        audio,
        isAIAnswer: iaAnswer,
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

    pusherServer.trigger('chat-channel', 'new-message', {
      chatId,
      newConversation,
    })

    return newConversation
  } catch (error) {
    console.error('Create new conversation Error:', error)
    throw error
  }
}
