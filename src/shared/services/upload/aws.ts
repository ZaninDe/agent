import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dotenv from 'dotenv'

dotenv.config()

// const {
//   AWS_ACCESS_KEY_ID,
//   AWS_SECRET_ACCESS_KEY,
//   AWS_REGION_NAME,
//   AWS_S3_BUCKET_NAME,
// } = process.env

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_REGION_NAME = process.env.AWS_REGION_NAME || 'us-west-1'
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME

console.log(`AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}`)
console.log(`AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}`)
console.log(`AWS_REGION_NAME: ${AWS_REGION_NAME}`)
console.log(`AWS_S3_BUCKET_NAME: ${AWS_S3_BUCKET_NAME}`)

// if (
//   !AWS_ACCESS_KEY_ID ||
//   !AWS_SECRET_ACCESS_KEY ||
//   !AWS_REGION_NAME ||
//   !AWS_S3_BUCKET_NAME
// ) {
//   throw new Error(
//     'One or more environment variables are not set. Please check your .env file.',
//   )
// }

const s3 = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  region: AWS_REGION_NAME,
})

export const generatePresignedUrl = async (objectKey: string) => {
  const getObjectParams = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: objectKey,
    Expires: 3600,
  }
  const command = new GetObjectCommand(getObjectParams)
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return url
}

export const uploadAudioStreamToS3 = async (
  audioStream: Buffer,
  messageSid: string,
) => {
  const remotePath = `${messageSid}.mp3`
  await s3.send(
    new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: remotePath,
      Body: audioStream,
      ContentType: 'audio/mpeg',
    }),
  )
  return remotePath
}
