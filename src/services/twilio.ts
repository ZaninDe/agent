import { Twilio } from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const twilioClient = new Twilio(accountSid, authToken)

export interface ReceiveMessageProps {
  from: string
  body: string
}

export const receiveMessage = async ({ from, body }: ReceiveMessageProps) => {
  try {
    twilioClient.messages.create({
      body,
      from: 'whatsapp:+14155238886',
      to: from,
    })
  } catch (err) {
    console.log(err)
  }
}
