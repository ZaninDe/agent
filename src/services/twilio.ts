import { Twilio } from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const twilioClient = new Twilio(accountSid, authToken)

export interface SendMessageProps {
  from: string
  content: string
}

export const sendMessage = async ({ from, content }: SendMessageProps) => {
  try {
    twilioClient.messages.create({
      body: content || 'default',
      from: '+5512992533599',
      to: from || 'whatsapp:+5512991176085',
    })
  } catch (err) {
    console.log(err)
  }
}
