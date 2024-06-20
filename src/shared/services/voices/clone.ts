/* eslint-disable no-async-promise-executor */
import { ElevenLabsClient } from 'elevenlabs'
import { createWriteStream } from 'fs'

import dotenv from 'dotenv'

dotenv.config()

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
})

export const createAudioStreamFromText = async (
  text: string,
): Promise<Buffer> => {
  const audioStream = await client.generate({
    voice: '5p9IbzcK4R8rN1fpGdMF',
    model_id: 'eleven_turbo_v2',
    text: 'Infelizmente, como assistente virtual, eu não consigo enviar áudios. Mas posso te informar que meu nome é Adbat. ',
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
        voice: 'Rachel',
        model_id: 'eleven_turbo_v2',
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
