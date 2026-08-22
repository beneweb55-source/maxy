import { GoogleGenAI } from "@google/genai";
import dns from "node:dns";

// Fix for Node.js IPv6 hanging issues with Gemini API
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Ensure the API key is strictly server-side
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV === "production") {
  console.warn("GEMINI_API_KEY is missing in production environment");
}

export const aiClient = new GoogleGenAI({
  apiKey: apiKey || "",
});

export const MODEL_NAME = "gemini-3.6-flash"; // Powerful model for reasoning
