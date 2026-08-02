import { api } from "@/lib/api";

export const chatWithAI = async (message: string, history: any[] = [], onToken: (token: string) => void) => {
  const baseURL = api.defaults.baseURL || '';
  const response = await fetch(`${baseURL}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to connect to AI');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const { token, error } = JSON.parse(data);
          if (error) throw new Error(error);
          if (token) onToken(token);
        } catch (e) {
          console.error("Error parsing AI stream:", e);
        }
      }
    }
  }
};

export const smartSearchEmployees = async (query: string) => {
  const res = await api.get(`/api/ai/smart-search?query=${query}`);
  return res.data;
};

export const classifyIntent = async (query: string) => {
  const res = await api.post("/api/ai/classify", { query });
  return res.data;
};
