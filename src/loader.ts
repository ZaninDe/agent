import path from 'node:path'

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import { TokenTextSplitter } from 'langchain/text_splitter'
import { RedisVectorStore } from '@langchain/redis'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from 'redis'

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

  const redis = createClient({
    url: 'redis://127.0.0.1:6379',
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
