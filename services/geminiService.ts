import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeminiAnalysisResponse } from "../types";

// Initialize Gemini client
// Note: API Key must be provided via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isFillable: {
      type: Type.BOOLEAN,
      description: "Set to TRUE if the PDF contains interactive, digitally editable form fields (AcroForm/XFA widgets) where a user can type. Set to FALSE for static forms designed for printing.",
    },
    fieldCount: {
      type: Type.INTEGER,
      description: "Estimated number of interactive, digitally editable input fields detected. Return 0 if the document is read-only/static.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief explanation of why it is classified as fillable or read-only. Mention if it has digital text boxes or if it is just lines for handwriting.",
    },
  },
  required: ["isFillable", "fieldCount", "summary"],
};

export const analyzePdfContent = async (base64Data: string): Promise<GeminiAnalysisResponse> => {
  try {
    const model = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          {
            text: `Analyze this PDF document and determine if it is an **Interactive Fillable Form**.

            **CLASSIFICATION RULES:**
            1.  **FILLABLE (True)**: The document allows a user to type directly into fields on a computer/device. Look for visual indicators of digital widgets such as:
                *   Text boxes with distinct borders or shading intended for digital entry.
                *   Clickable checkboxes or radio buttons.
                *   Dropdown lists.
                *   *Note: Many government forms (like cf02type3-7.pdf) ARE fillable. If it looks like a standard official form with defined boxes for data entry that appear cleaner or more structured than a simple scan, it is likely fillable.*

            2.  **READ-ONLY (False)**: The document is designed ONLY for printing and handwriting.
                *   Look for simple underlines (e.g., "Name: ___________").
                *   Look for visual cues that suggest it's a flat image or scan.
                *   If the user cannot click and type, it is read-only.

            **Your Goal**: Distinguish between a form you print-and-fill (Read-only) vs a form you type-in-app (Fillable).

            Return the result in JSON format based on the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.1, // Low temperature for more deterministic analysis
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(text) as GeminiAnalysisResponse;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};