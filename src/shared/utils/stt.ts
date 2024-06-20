/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import fs from 'fs'
import OpenAI from 'openai'

interface STTProps {
  messageSid: string
  mediaUrl0: any
}

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function STT({ messageSid, mediaUrl0 }: STTProps) {
  try {
    const response = await axios.get(mediaUrl0, {
      auth: {
        username: accountSid || '',
        password: authToken || '',
      },
      responseType: 'stream',
    })

    const audioFileName = `../../../audios/${messageSid}.mp3`
    const fileStream = fs.createWriteStream(audioFileName)

    response.data.pipe(fileStream)

    fileStream.on('finish', async () => {
      console.log(`Áudio salvo como ${audioFileName}`)
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFileName),
        model: 'whisper-1',
      })

      fs.unlink(audioFileName, (err) => {
        if (err) {
          console.error('Erro ao excluir o arquivo:', err)
        } else {
          console.log('Arquivo excluído com sucesso!')
        }
      })

      console.log(transcription.text)
      return transcription.text || ''
    })
  } catch (err) {
    console.log(err)
  }
}
