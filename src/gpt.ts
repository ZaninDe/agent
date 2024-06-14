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
import { redis, redisVectorStore } from './redis-store'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { db } from '../lib/db'

const retriever = redisVectorStore.asRetriever()
const llm = new ChatOpenAI({ model: 'gpt-3.5-turbo' })

interface ChatProps {
  query: string
  from: string
  chatId: string
}

export const chat = async ({ query, from, chatId }: ChatProps) => {
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
Você é um assistente de atendimento da clínica ICAMI, clínica médica de saúde e bem-star
Dentro do playbook estão todas as instruções que o assitente deve saber para um atendimento completo
Seja o mais natural possível, se pareça com um humano atendente de uma clínica
\n\n
playbook:
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

  // const conversations = await db.conversation.findMany({
  //   where: {
  //     chatId,
  //   },
  //   orderBy: {
  //     createdAt: 'desc',
  //   },
  //   take: 20,
  // })

  // console.log('CONVERSATIONS::::::::::::::: ', conversations)

  // if (conversations) {
  //   conversations.map((conversation) => {
  //     const newHumanMessage = new HumanMessage(conversation?.user)
  //     chat_history.push(newHumanMessage)
  //     const newAiMessage = new AIMessage(conversation?.ia)
  //     chat_history.push(newAiMessage)
  //   })
  // }

  const response = await ragChain.invoke({
    chat_history,
    input: query,
  })
  console.log(response)
  redis.disconnect()

  return response.answer
}
