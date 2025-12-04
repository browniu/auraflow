import { GoogleGenAI, Type } from "@google/genai";

export const generateModuleConfig = async (description: string): Promise<{
  promptTemplate: string;
  suggestedSelectors: { input: string; submit: string; result: string };
}> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("process.env.API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `I am building a web automation module. 
    User description of the task: "${description}".
    
    Please generate:
    1. A professional, clear Prompt Template that asks an AI to perform this task. Use {{input}} as the placeholder for user data.
    2. Suggested CSS selectors for a generic modern chat interface (like ChatGPT/Gemini) if specific ones aren't known.
    
    Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          promptTemplate: {
            type: Type.STRING,
            description: "The generated prompt template"
          },
          suggestedSelectors: {
            type: Type.OBJECT,
            properties: {
              input: { type: Type.STRING },
              submit: { type: Type.STRING },
              result: { type: Type.STRING }
            }
          }
        }
      }
    }
  });

  if (!response.text) throw new Error("No response from Gemini");
  return JSON.parse(response.text);
};