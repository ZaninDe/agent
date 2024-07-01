export function splitMessage(message: string, maxLength: number) {
  if (message.length <= maxLength) {
    return [message]
  }

  const splitPattern = /(?<!\b\d+\.\s)(?<!\w+\.\w+)[^.?!]+(?:[.?!]+["']?|$)/g
  const sentences = message.match(splitPattern)

  const messages = []
  let currentMessage = ''

  if (sentences) {
    for (const sentence of sentences) {
      if ((currentMessage + sentence).length <= maxLength) {
        currentMessage += sentence
      } else {
        if (currentMessage.length > 0) {
          messages.push(currentMessage.trim())
        }
        currentMessage = sentence
      }
    }
  }

  if (currentMessage.length > 0) {
    messages.push(currentMessage.trim())
  }

  return messages
}
