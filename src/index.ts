import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js'
import 'dotenv/config'
import qrcode from 'qrcode-terminal'
// import qrcode from 'qrcode'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import path from 'node:path'
import { db } from '../lib/db'

import { User } from '@prisma/client'
import { STT } from './shared/services/voices/stt'
import { TTS } from './shared/services/voices/tts'
import { chat } from './shared/services/gpt'
import { createNewConversation } from './shared/services/history'

const client = new Client({
  authStrategy: new LocalAuth(),
  webVersionCache: {
    type: 'remote',
    remotePath:
      'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  },
})

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true })
  // Opções para gerar o QR code (tamanho, margem, etc.)
  // const options = {
  //   type: 'png', // Formato do arquivo (png, svg, etc.)
  //   width: 300, // Largura do QR code
  //   margin: 2, // Margem ao redor do QR code
  // }
  // console.log('QRCODE: ', qr)

  // Função para gerar o QR code
  // qrcode.toFile('./qrcode.png', qr, (err) => {
  //   if (err) {
  //     console.error('Erro ao gerar o QR code:', err)
  //   } else {
  //     console.log('QR code gerado com sucesso!')
  //   }
  // })
})

client.on('ready', () => {
  console.log(' 🚀 Client is ready!')
})

let modelOn = true

client.on('message_create', async (message: Message) => {
  const contact = message.getContact()
  const name = (await contact).pushname
  const number = (await contact).number

  if (number === '5512992504013') {
    let chatId = ''

    let user: User | undefined
    const ExistingUser = await db.user.findFirst({
      where: {
        contactNumber: number,
      },
    })

    if (!ExistingUser) {
      const newUser = await db.user.create({
        data: {
          name,
          contactNumber: number,
        },
      })
      user = newUser
    } else {
      user = ExistingUser
    }
    console.log('USER: ', user)

    const chatData = await db.chat.findFirst({
      where: {
        user,
      },
    })

    if (!chatData) {
      const newChat = await db.chat.create({
        data: {
          userId: user.id,
        },
      })
      chatId = newChat.id
    } else {
      chatId = chatData.id
    }
    if (message.type === 'ptt') {
      console.log('Voice Clip Received')

      const media = await message.downloadMedia()
      if (media) {
        const originalAudio = path.resolve(
          __dirname,
          `../audios/${message.id.id}.ogg`,
        )
        const speech = path.resolve(
          __dirname,
          `../audios/${message.id.id}_speech.mp3`,
        )
        const oggFilePath = path.resolve(
          __dirname,
          `../audios/${message.id.id}_formated_speech.ogg`,
        )

        const binaryData = Buffer.from(media.data, 'base64')
        // const filePath = 'audio.ogg';
        fs.writeFile(originalAudio, binaryData, async (err) => {
          if (err) {
            console.error('Error saving audio file:', err)
          } else {
            console.log('Audio file saved:', originalAudio)
            const text = await STT(originalAudio)
            console.log('TEXT: #######', text)

            if (
              text?.toLocaleLowerCase() === 'quero falar com um humano' ||
              text?.toLocaleLowerCase() === 'quero falar com um humano.'
            ) {
              client.sendMessage(
                message.from,
                'Claro, todos os nossos especialistas estão ocupados neste momento, assim que possível um deles irá te chamar por aqui mesmo, tudo bem? 🙋‍♂️',
              )
              modelOn = false
              return
            }

            if (
              text?.toLocaleLowerCase() === 'quero falar com o assistente' ||
              text?.toLocaleLowerCase() === 'quero falar com o assistente.'
            ) {
              modelOn = true
            }

            if (text !== undefined) {
              console.log(text)
              const answer = await chat({
                query: text,
                chatId,
              })
              await TTS(answer, speech)

              ffmpeg(`audios/${message.id.id}_speech.mp3`)
                .audioCodec('libopus')
                .audioBitrate('64k')
                .format('ogg')
                .save(oggFilePath)
                .on('error', (err) => {
                  console.error('Erro ao converter arquivo:', err)
                })
                .on('end', async () => {
                  console.log(
                    'Arquivo convertido com sucesso para OGG com codec Opus.',
                  )
                  const media = MessageMedia.fromFilePath(oggFilePath)
                  await client.sendMessage(message.from, media, {
                    sendAudioAsVoice: true,
                  })

                  const newHistory = await createNewConversation({
                    audio: true,
                    aiMessage: answer,
                    userMessage: text,
                    chatId,
                  })

                  fs.unlink(originalAudio, (err) => {
                    if (err) {
                      console.error(`Erro ao apagar o arquivo`, err)
                    } else {
                      console.log(`Arquivo apagado com sucesso.`)
                    }
                  })

                  fs.unlink(speech, (err) => {
                    if (err) {
                      console.error(`Erro ao apagar o arquivo`, err)
                    } else {
                      console.log(`Arquivo apagado com sucesso.`)
                    }
                  })

                  fs.unlink(oggFilePath, (err) => {
                    if (err) {
                      console.error(`Erro ao apagar o arquivo`, err)
                    } else {
                      console.log(`Arquivo apagado com sucesso.`)
                    }
                  })
                })
            }
          }
        })
      }
    } else {
      const contentMessage = message.body.toLowerCase()
      if (
        contentMessage === 'quero falar com um humano' ||
        contentMessage === 'quero falar com um humano.'
      ) {
        client.sendMessage(
          message.from,
          'Claro, todos os nossos especialistas estão ocupados neste momento, assim que possível um deles irá te chamar por aqui mesmo, tudo bem? 🙋‍♂️',
        )
        modelOn = false
      }

      if (
        contentMessage === 'quero falar com o assistente' ||
        contentMessage === 'quero falar com o assistente.'
      ) {
        modelOn = true
      }

      if (modelOn) {
        const answer = await chat({
          query: message.body,
          chatId,
        })
        client.sendMessage(message.from, answer)
        const newHistory = await createNewConversation({
          audio: false,
          aiMessage: answer,
          userMessage: message.body,
          chatId,
        })
      }
    }
  }
})

client.initialize()
