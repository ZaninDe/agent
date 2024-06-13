import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI();

export async function TTS(text: string, target_path: string) {
  const speechFile = path.resolve(target_path);
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "echo",
    input: text,
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
}