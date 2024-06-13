import { redis, redisVectorStore } from './redis-store'

async function search() {
  await redis.connect()

  const response = await redisVectorStore.similaritySearchWithScore(
    'Qual a diferença entre dificuldade de aprendizagem e dificuldade específica de aprendizagem?',
    5,
  )

  console.log(response)

  await redis.disconnect()
}

search()
