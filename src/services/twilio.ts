import { Twilio } from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const twilioClient = new Twilio(accountSid, authToken)

export interface ReceiveMessageProps {
  from: string
  content: string
}

export const receiveMessage = async ({
  from,
  content,
}: ReceiveMessageProps) => {
  console.log('FROM', from)
  try {
    twilioClient.messages.create({
      body: content || 'default',
      from: 'whatsapp:+14155238886',
      to: from || 'whatsapp:+5512991176085',
    })
  } catch (err) {
    console.log(err)
  }
}
