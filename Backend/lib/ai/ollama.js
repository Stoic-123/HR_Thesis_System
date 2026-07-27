import { Ollama } from "ollama";
import prisma from "../prisma.js";

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434" });

// Helper to call OpenAI-compatible endpoint of cloud providers
const callCloudApi = async (provider, model, apiKey, messages, onStream) => {
  let url = "";
  let extraHeaders = {};
  if (provider === "huggingface") {
    url = "https://router.huggingface.co/v1/chat/completions";
  } else if (provider === "openrouter") {
    url = "https://openrouter.ai/api/v1/chat/completions";
    extraHeaders = {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "HR System"
    };
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...extraHeaders
    },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onStream
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud AI API Error (${provider}): ${errorText}`);
  }

  if (onStream) {
    const reader = response.body.getReader ? response.body.getReader() : null;
    const decoder = new TextDecoder();
    let buffer = "";

    if (reader) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const token = parsed.choices[0]?.delta?.content || "";
              if (token) onStream(token);
            } catch (e) {
              // ignore JSON parse errors
            }
          }
        }
      }
    } else if (typeof response.body[Symbol.asyncIterator] === 'function') {
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (cleanedLine.startsWith("data: ")) {
            const dataStr = cleanedLine.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              const token = parsed.choices[0]?.delta?.content || "";
              if (token) onStream(token);
            } catch (e) {
              // ignore JSON parse errors
            }
          }
        }
      }
    }
  } else {
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error));
    }
    return result.choices?.[0]?.message?.content || "";
  }
};

export const chatWithAI = async (messages, defaultModel = "qwen2.5:1.5b", onStream = null, companyId = null) => {
  let provider = process.env.AI_PROVIDER || "ollama";
  let model = defaultModel;
  let apiKey = null;

  try {

    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: parseInt(companyId) },
        select: {
          ai_provider: true,
          ai_api_key: true,
          ai_model: true
        }
      });
      if (company) {
        if (company.ai_provider) provider = company.ai_provider;
        if (company.ai_model) model = company.ai_model;
        if (company.ai_api_key) apiKey = company.ai_api_key;
      }
    }

    // Default API keys from process.env if company has not provided one but selected cloud
    if (!apiKey) {
      if (provider === "huggingface") apiKey = process.env.HF_API_KEY || process.env.HF_TOKEN;
      else if (provider === "openrouter") apiKey = process.env.OPENROUTER_API_KEY;
    }

    if (provider !== "ollama") {
      try {
        if (!apiKey) {
          throw new Error(`API Key / Token is required for provider: ${provider}. Please configure it in your Company settings.`);
        }
        console.log(`[AI Routing] Routing to Cloud API (${provider}) using model: ${model}`);
        return await callCloudApi(provider, model, apiKey, messages, onStream);
      } catch (cloudErr) {
        console.warn(`[AI Routing] Cloud API (${provider}) failed: ${cloudErr.message}. Falling back to local Ollama...`);
        // Fallback to local Ollama below
      }
    }

    // Fallback to local Ollama
    console.log(`[AI Routing] Routing to Local Ollama using model: ${model}`);
    const ollamaHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    const localOllama = ollamaHost === (process.env.OLLAMA_HOST || "http://127.0.0.1:11434")
      ? ollama
      : new Ollama({ host: ollamaHost });

    if (onStream) {
      const response = await localOllama.chat({
        model,
        messages,
        stream: true,
      });
      for await (const part of response) {
        onStream(part.message.content);
      }
      return;
    }

    const response = await localOllama.chat({
      model,
      messages,
      stream: false,
    });
    return response.message.content;
  } catch (error) {
    if (error.message.includes("not found")) {
      throw new Error(`AI Model '${model}' is not installed. Please run 'ollama pull ${model}' in your terminal.`);
    }
    console.error("[AI Service] Chat Error:", error);
    throw new Error(`Failed to communicate with AI model. ${error.message}`);
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
