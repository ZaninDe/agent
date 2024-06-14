import { Twilio } from 'twilio'
import dotenv from 'dotenv'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const twilioClient = new Twilio(accountSid, authToken)

export interface ReceiveMessageProps {
  from: string
}

export const receiveMessage = async ({ from }: ReceiveMessageProps) => {
  console.log('FROM:::::', from)
  try {
    twilioClient.messages.create({
      body: 'Olá!!!',
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+5512991176085',
    })
  } catch (err) {
    console.log(err)
  }
}
