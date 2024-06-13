import fs from 'fs';
import { Client, LocalAuth } from 'whatsapp-web.js';
import OpenAI from "openai";

const openai = new OpenAI();

export async function transcribeAudio(filePath: string) {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });
    
      console.log(transcription.text);
      return transcription.text

    } catch (error) {
        console.error('Error during transcription:', error);
    }
}
