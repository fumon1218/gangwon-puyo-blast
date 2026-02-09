import { GoogleGenAI } from "@google/genai";

export const generateBackgroundImage = async (): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: 'A beautiful, wide-angle landscape of a seaside village in Gangwon-do, South Korea. Pixar animation style, 3D render, vibrant colors, sunny blue sky, cute colorful roofs, sparkling ocean, fluffy clouds. High quality, detailed.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to generate background", error);
    return null;
  }
};