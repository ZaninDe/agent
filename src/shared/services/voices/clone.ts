/* eslint-disable no-async-promise-executor */
import { ElevenLabsClient } from 'elevenlabs'
import { createWriteStream } from 'fs'

import dotenv from 'dotenv'

dotenv.config()

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
})

export const createAudioStreamFromText = async (
  text: string,
): Promise<Buffer> => {
  const audioStream = await client.generate({
    voice: ELEVENLABS_VOICE_ID,
    model_id: 'eleven_multilingual_v2',
    text,
  })

  const chunks: Buffer[] = []
  for await (const chunk of audioStream) {
    chunks.push(chunk)
  }

  const content = Buffer.concat(chunks)
  return content
}

export const createAudioFileFromText = async (
  text: string,
  messageSid: string,
): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const audio = await client.generate({
        voice: ELEVENLABS_VOICE_ID,
        model_id: 'eleven_multilingual_v2',
        text,
      })
      const fileName = `${messageSid}.mp3`
      const fileStream = createWriteStream(fileName)

      audio.pipe(fileStream)
      fileStream.on('finish', () => resolve(fileName))
      fileStream.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}
