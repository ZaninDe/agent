import { Twilio } from 'twilio'
import dotenv from 'dotenv'
import { uploadAudioStreamToS3, generatePresignedUrl } from './upload/aws'
import { createAudioStreamFromText } from './voices/clone'

dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappSender = process.env.WHATSAPP_SENDER

const twilioClient = new Twilio(accountSid, authToken)

export interface SendTextMessageProps {
  to: string
  content: string
}
export interface SendAudioMessageProps {
  to: string
  content: string
  messageSid: string
}

export const sendTextMessage = async ({
  to,
  content,
}: SendTextMessageProps) => {
  try {
    twilioClient.messages.create({
      body: content || 'default',
      from: whatsappSender,
      to,
    })
  } catch (err) {
    console.log(err)
  }
}

export const sendAudioMessage = async ({
  to,
  content,
  messageSid,
}: SendAudioMessageProps) => {
  try {
    const stream = await createAudioStreamFromText(content)

    const s3path = await uploadAudioStreamToS3(stream, messageSid)

    const presignedUrl = await generatePresignedUrl(s3path)

    console.log('Presigned URL:', presignedUrl)

    twilioClient.messages.create({
      mediaUrl: [presignedUrl],
      from: whatsappSender,
      to,
    })
  } catch (err) {
    console.log(err)
  }
}
