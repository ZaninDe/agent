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

    return newConversation
  } catch (error) {
    console.error('Create new conversation Error:', error)
    throw error
  }
}

export async function deleteConversation(chatId: string) {
  try {
    await db.conversation.deleteMany({
      where: {
        chatId,
      },
    })
  } catch (err) {
    console.log(err)
  }
}
