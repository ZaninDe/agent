import path from 'node:path'

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { TokenTextSplitter } from 'langchain/text_splitter'
import { RedisVectorStore } from '@langchain/redis'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from 'redis'
import axios from 'axios'

const loader = new DirectoryLoader(path.resolve(__dirname, '../tmp'), {
  '.pdf': (path) => new PDFLoader(path),
  '.txt': (path) => new TextLoader(path),
})

async function load() {
  const docs = await loader.load()

  const splitter = new TokenTextSplitter({
    encodingName: 'cl100k_base',
    chunkSize: 600,
    chunkOverlap: 0,
  })

  const splittedDocuments = await splitter.splitDocuments(docs)

  // Função para obter o IP público da instância
  async function getPublicIpAddress() {
    try {
      const response = await axios.get('http://checkip.amazonaws.com')
      return response.data.trim() // O IP vem com espaços em branco ao redor, então removemos com trim()
    } catch (error) {
      console.error('Erro ao obter o IP público:', error)
      return null
    }
  }

  const ip = await getPublicIpAddress()

  const redis = createClient({
    url: `redis://${ip}:6379` || 'redis://127.0.0.1:6379',
  })

  await redis.connect()

  await RedisVectorStore.fromDocuments(
    splittedDocuments,
    new OpenAIEmbeddings(),
    {
      indexName: 'playbook-embeddings',
      redisClient: redis,
      keyPrefix: 'playbook',
    },
  )

  await redis.disconnect()
}

load()
