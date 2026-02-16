import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
}

const openai = new OpenAI({
    apiKey: apiKey,
});

export async function generatePracticeQuestion(
    topic: string,
    language: string
): Promise<string> {

    try {

        const prompt = `
Generate ONE beginner-friendly coding practice question.

Topic: ${topic}
Programming Language: ${language}

STRICT RULES:
- DO NOT include headings.
- DO NOT include the word "Question".
- DO NOT include separators like ===== or ----.
- DO NOT include any decorative formatting.
- DO NOT include solution.
- DO NOT include explanation.
- Return ONLY plain question text.
- Return clean paragraph text only.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.6,
        });

        let rawText = response.choices[0].message.content || "No question generated.";

        // 🔥 Extra Safety: Remove unwanted formatting if AI still adds it
        rawText = rawText
            .replace(/=+/g, "")         // remove =====
            .replace(/-+/g, "")         // remove ----
            .replace(/Question:/gi, "") // remove accidental Question:
            .trim();

        return rawText;

    } catch (error: any) {

        const errorMessage = error?.message || JSON.stringify(error);
        console.error("OPENAI ERROR:", errorMessage);

        if (error?.status === 401) {
            return "OpenAI API Error: Invalid API key. Please check your OPENAI_API_KEY in .env";
        }

        if (error?.status === 429) {
            return "OpenAI API Error: Quota exceeded. Check billing settings.";
        }

        return `OpenAI Error: ${errorMessage}`;
    }
}
