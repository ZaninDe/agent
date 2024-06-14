import { RedisVectorStore } from '@langchain/redis'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from 'redis'

export const redis = createClient({
  url: 'redis://127.0.0.1:6379',
})

export const redisVectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
  indexName: 'playbook-embeddings',
  redisClient: redis,
  keyPrefix: 'playbook',
})
