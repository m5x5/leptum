import { Ollama } from "langchain/llms/ollama";

export const ollama = new Ollama({
  baseUrl: "http://localhost:11434",
  model: "llama2",
});
