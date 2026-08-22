import { GoogleGenAI } from "@google/genai";

// Ensure the API key is strictly server-side
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV === "production") {
  console.warn("GEMINI_API_KEY is missing in production environment");
}

export const aiClient = new GoogleGenAI({
  apiKey: apiKey || "",
});

export const MODEL_NAME = "gemini-2.5-pro"; // Powerful model for reasoning
