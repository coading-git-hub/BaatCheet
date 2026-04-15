import { GoogleGenAI } from "@google/genai";

// Standard initialization as per Gemini API skill
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
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
      // If the error is about the API key, the platform will usually handle the prompt
      // but we return a generic message to the UI.
      if (error.message.includes("API_KEY_INVALID") || error.message.includes("403")) {
        return "Error: API Key issue. Please check your AI Studio secrets.";
      }
      return `Error: ${error.message}`;
    }
    return "Error during translation";
  }
}
