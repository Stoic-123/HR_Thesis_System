import prisma from "./lib/prisma.js";

async function main() {
  try {
    const company = await prisma.company.findFirst();
    const apiKey = company.ai_api_key;
    const model = company.ai_model || "Qwen/Qwen2.5-7B-Instruct";
    
    console.log(`Sending test request to Hugging Face: model="${model}", token="hf_ct..."`);
    
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "hi" }],
        stream: false
      })
    });
    
    console.log("Response status:", response.status);
    const bodyText = await response.text();
    console.log("Response body:", bodyText);
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
