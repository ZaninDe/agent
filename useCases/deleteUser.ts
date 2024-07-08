import { db } from '../lib/db'
import { pusherServer } from '../lib/pusher'
import { IDeleteUser } from '../src/shared/infra/http/server'

export async function deleteUser({ userPhone }: IDeleteUser) {
  try {
    const userData = await db.user.findFirst({
      where: {
        contactNumber: userPhone,
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
      pusherServer.trigger('chat-channel', 'new-chat', {
        chatId: chat?.id,
      })
    }
  } catch (err) {
    console.log(err)
  }
}
