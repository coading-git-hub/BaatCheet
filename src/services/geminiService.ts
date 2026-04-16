import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
if (!apiKey) {
  throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env file.");
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following text from ${sourceLang} to ${targetLang}. 
      Return ONLY the translated text, no explanations or extra text.
      
      Text: "${text}"`,
    });

    return response.text?.trim() || "Translation failed";
  } catch (error) {
    console.error("Translation error:", error);
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes("reported as leaked")) {
        return "Error: Your API key was reported as leaked. Replace it with a new key and keep it private.";
      }
      if (message.includes("API_KEY_INVALID") || message.includes("403")) {
        return "Error: API key issue. Please check your AI Studio secrets.";
      }
      return `Error: ${message}`;
    }
    return "Error during translation";
  }
}
