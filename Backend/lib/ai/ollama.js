import { Ollama } from "ollama";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434" });

export const chatWithAI = async (messages, model = "llama3.2", onStream = null) => {
  try {
    if (onStream) {
      const response = await ollama.chat({
        model,
        messages,
        stream: true,
      });
      for await (const part of response) {
        onStream(part.message.content);
      }
      return;
    }

    const response = await ollama.chat({
      model,
      messages,
      stream: false,
    });
    return response.message.content;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw new Error(`AI Model '${model}' is not installed. Please run 'ollama pull ${model}' in your terminal.`);
    }
    console.error("[Ollama Service] Chat Error:", error);
    throw new Error("Failed to communicate with AI model.");
  }
};

export const getEmbeddings = async (text, model = "nomic-embed-text") => {
  try {
    const response = await ollama.embeddings({
      model,
      prompt: text,
    });
    return response.embedding;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw new Error(`AI Model '${model}' is not installed. Please run 'ollama pull ${model}' in your terminal.`);
    }
    console.error("[Ollama Service] Embedding Error:", error);
    throw new Error("Failed to generate embeddings.");
  }
};

export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  return dotProduct / (mA * mB);
};

export default ollama;
