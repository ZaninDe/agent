/* eslint-disable array-callback-return */
/* eslint-disable camelcase */
import { ChatOpenAI } from '@langchain/openai'
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

import dotenv from 'dotenv'
import OpenAI from 'openai'
import { db } from '../../../lib/db'
import { redisVectorStore, redis } from '../../redis-store'
import {
  contextualizeQSystemPrompt,
  qaMainAudioPrompt,
  qaMainPrompt,
} from '../../utils/constants/prompts'

dotenv.config()

const retriever = redisVectorStore.asRetriever()
const llm = new ChatOpenAI({
  model: 'gpt-4o-2024-05-13',
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatProps {
  query: string
  chatId: string
  audioRequested: boolean
}

export const chat = async ({ query, chatId, audioRequested }: ChatProps) => {
  redis.connect()

  const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
    ['system', contextualizeQSystemPrompt],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
  ])
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt: contextualizeQPrompt,
  })

  const qaPrompt = ChatPromptTemplate.fromMessages([
    ['system', audioRequested ? qaMainAudioPrompt : qaMainPrompt],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
  ])

  const questionAnswerChain = await createStuffDocumentsChain({
    llm,
    prompt: qaPrompt,
  })

  const ragChain = await createRetrievalChain({
    retriever: historyAwareRetriever,
    combineDocsChain: questionAnswerChain,
  })

  const chat_history: BaseMessage[] = []

  const conversations = await db.conversation.findMany({
    where: {
      chatId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  })

  if (conversations) {
    conversations.map((conversation) => {
      const newHumanMessage = new HumanMessage(conversation?.user)
      chat_history.push(newHumanMessage)
      const newAiMessage = new AIMessage(conversation?.ia)
      chat_history.push(newAiMessage)
    })
  }

  const response = await ragChain.invoke({
    chat_history,
    input: query,
  })
  console.log(response)
  redis.disconnect()

  return response.answer
}

export const isAudioRequested = async (
  userMessage: string,
): Promise<boolean> => {
  const prompt = `
Verifique se a seguinte mensagem do usuário está solicitando uma resposta em formato de áudio. Responda apenas com "true" ou "false":
Mensagem: "${userMessage}"
`

  try {
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente que ajuda a identificar solicitações específicas nas mensagens.',
        },
        { role: 'user', content: prompt },
      ],
    })

    const answer = completion?.choices[0]?.message?.content
      ?.trim()
      .toLowerCase()

    if (answer === 'true') return true
    else return false
  } catch (error) {
    console.error('Error check audio:', error)
    return false
  }
}
// ;(async () => {
//   const answer = await chat({
//     query:
//       'por favor, me mande um áudio explicando como fucniona o marketing inbound',
//     chatId: '66749d2705c3d6140b1999cf',
//     audioRequested: true,
//   })

//   await createAudioFileFromText(answer, 'TESTEAUDIO')
// })()
