import { db } from '../lib/db'
import AppError from '../src/shared/erros/appErrors'

interface ManageAgentProps {
  chatId: string
}

export async function manageAgent({ chatId }: ManageAgentProps) {
  try {
    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
      },
    })

    if (!chat) {
      console.log('Chat não existe!')
      return
    }

    const newChat = await db.chat.update({
      where: {
        id: chatId,
      },
      data: {
        agentIsActive: !chat.agentIsActive,
      },
    })
    return newChat
  } catch (err) {
    console.error(err)
    throw new AppError('erro ao alterar status do agent')
  }
}
