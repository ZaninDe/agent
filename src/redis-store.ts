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

export async function connectToRedis() {
  if (!redis.isOpen) {
    try {
      await redis.connect()
      console.log('Connected to Redis')
    } catch (err) {
      console.error('Error connecting to Redis:', err)
    }
  } else {
    console.log('Redis connection already established')
  }
}

export async function disconnectFromRedis() {
  if (redis.isOpen) {
    try {
      await redis.disconnect()
      console.log('Disconnected from Redis')
    } catch (err) {
      console.error('Error disconnecting from Redis:', err)
    }
  }
}
