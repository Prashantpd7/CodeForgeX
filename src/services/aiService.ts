import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function generatePracticeQuestion(topic: string, language: string): Promise<string> {

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest"
        });

        const prompt = `
Generate ONE beginner-friendly coding practice question.

Topic: ${topic}
Programming Language: ${language}

Rules:
- Focus on concept building.
- Keep problem clear and structured.
- Do NOT include solution.
- Do NOT include explanation.
- Only return the question text.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        return response.text();

    } catch (error: any) {
        console.error("FULL GEMINI ERROR:", error);
        return `Gemini Error: ${error.message}`;
    }
}
