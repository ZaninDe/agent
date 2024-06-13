import { db } from "../../lib/db";

interface AddMessageToConversationProps {
  chatId: string;
  userMessage: string;
  aiMessage: string;
  audio: boolean
}

export async function createNewConversation({chatId, aiMessage, userMessage, audio} : AddMessageToConversationProps) {
  try {
    const newConversation = await db.conversation.create({
      data: {
        ia: aiMessage,
        user: userMessage,
        audio: audio,
        chatId: chatId
      }
    });

    // const updatedChat = await db.chat.update({
    //   where: { id: chatId },
    //   data: {
    //     conversation: {
    //       set: newConversation
    //     }
    //   },
    //   include: { conversation: true }
    // });

    // return updatedChat;
  } catch (error) {
    console.error('Create new conversation Error:', error);
    throw error;
  }
}