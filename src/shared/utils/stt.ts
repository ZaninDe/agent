/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

interface STTProps {
  messageSid: string
  mediaUrl0: any
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
export async function STT({
  messageSid,
  mediaUrl0,
}: STTProps): Promise<string> {
  try {
    const response = await axios.get(mediaUrl0, {
      auth: {
        username: process.env.ACCOUNT_SID || '',
        password: process.env.AUTH_TOKEN || '',
      },
      responseType: 'stream',
    })

    const audioFileName = path.join(__dirname, `${messageSid}.mp3`)
    const fileStream = fs.createWriteStream(audioFileName)

    response.data.pipe(fileStream)

    return new Promise((resolve, reject) => {
      fileStream.on('finish', async () => {
        console.log(`Áudio salvo como ${audioFileName}`)
        try {
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

          resolve(transcription.text || '')
        } catch (error) {
          reject(error)
        }
      })

      fileStream.on('error', (err) => {
        reject(err)
      })
    })
  } catch (err) {
    console.log(err)
    throw err
  }
}
