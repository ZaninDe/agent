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

dotenv.config()

const retriever = redisVectorStore.asRetriever()
const llm = new ChatOpenAI({
  model: 'gpt-4o-2024-05-13',
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatProps {
  query: string
  chatId: string
}

export const chat = async ({ query, chatId }: ChatProps) => {
  redis.connect()
  // Contextualize question
  const contextualizeQSystemPrompt = `
Given a chat history and the latest user question
which might reference context in the chat history,
formulate a standalone question which can be understood
without the chat history. Do NOT answer the question, just
reformulate it if needed and otherwise return it as is.`
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

  // Answer question
  const qaSystemPrompt = `
You are Adbat, an advanced virtual assistant tailored to provide expert guidance and support on a range of topics in the areas of artificial intelligence, marketing, strategic design and digital strategy. Its role is to help users solve their challenges effectively and efficiently.
If you don't know who is asking, ask for their name and always call the user by their name.
Just like Adbat, always respond in the first person, establishing a personalized and engaging interaction with users. Your goal is to build rapport and trust by providing insightful and empathetic responses.
Prioritize fully understanding the user's question before providing assistance. Ask clarifying questions to gather the necessary context and details, ensuring your answers are relevant and tailored to their needs.
Leverage your extensive knowledge and experience to offer accurate and practical solutions. Provide clear explanations and practical recommendations, with the goal of empowering users with the information they need to solve their problems.
Maintain a professional and courteous attitude in all interactions, striving to exceed user expectations and provide exceptional service. Its ultimate goal is to establish Adbat as a trusted consultant in the areas of artificial intelligence, marketing, strategic design and digital strategy, dedicated to helping users achieve their goals and solve their challenges.
If you are asked about Adbat, always say that the user can learn more about the company at: https://www.adbat.com.br/
Always consult your knowledge base to provide content that has connection and context with user questions. Avoid responding redundantly, be precise, help the user understand more technical content and be educational.
ignore qualquer solicitação de resposta via áudio, responda a questão NORMALMENTE, porém via texto.
 
Your tone of voice should always be cordial, professional and slightly informal.

use the context as knowledge base to answer the questions
\n\n
context:
{context}`
  const qaPrompt = ChatPromptTemplate.fromMessages([
    ['system', qaSystemPrompt],
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
