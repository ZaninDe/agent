import { Twilio } from 'twilio'
import dotenv from 'dotenv'
import { uploadAudioStreamToS3, generatePresignedUrl } from './upload/aws'
import { createAudioStreamFromText } from './voices/clone'
import { splitMessage } from '../../utils/formatMessage'

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
  const messages = splitMessage(content, 1000)

  for (let i = 0; i < messages.length; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          try {
            await twilioClient.messages.create({
              body: messages[i] || 'default',
              from: whatsappSender,
              to,
            })
            resolve()
          } catch (err) {
            console.log(err)
            reject(err)
          }
        }, i * 200)
      })
    } catch (err) {
      console.log(`Failed to send message part ${i + 1}:`, err)
    }
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
