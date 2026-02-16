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
    language: string,
    difficulty: string,
    mode: string
): Promise<string> {

    try {

        // 🔥 Mode-Based Instruction Block
        let modeInstruction = "";

        if (mode === "Question Only") {
            modeInstruction = `
- Generate ONLY the question.
- DO NOT include hint.
- DO NOT include solution.
`;
        } else if (mode === "Question + Hint") {
            modeInstruction = `
- First write the question.
- Then write a short hint.
- Clearly separate question and hint using a blank line.
- DO NOT include solution.
`;
        } else if (mode === "Full Solution") {
            modeInstruction = `
- First write the question.
- Then provide the complete solution in ${language}.
- Clearly separate question and solution using a blank line.
`;
        } else if (mode === "Multiple Approaches") {
            modeInstruction = `
- First write the question.
- Then provide 2 different solution approaches in ${language}.
- Clearly separate each section using blank lines.
`;
        }
        let languageInstruction = "";

if (language === "javascript") {
    languageInstruction = `
- Generate PURE JavaScript.
- DO NOT use TypeScript type annotations.
- DO NOT use ": number", ": string", "number[]", etc.
- Do NOT write function signatures with types.
`;
}

else if (language === "typescript") {
    languageInstruction = `
- Generate proper TypeScript.
- Type annotations are allowed.
`;
}

else if (language === "python") {
    languageInstruction = `
- Generate proper Python.
- Do NOT use JavaScript syntax.
`;
}


        const prompt = `
        Generate ONE ${difficulty} level coding practice content.

        Topic: ${topic}
        Programming Language: ${language}

        Language Rules:
        ${languageInstruction}

        Difficulty Guidelines:
        - Easy → Basic logic
        - Medium → Moderate logic
        - Hard → Advanced logic, optimized approach

        Mode: ${mode}

        IMPORTANT OUTPUT FORMAT:

        You MUST return content strictly in this format:

        [QUESTION]
        <Question text here>

        ${mode === "Question Only" ? "" : `
        ${mode === "Question + Hint" ? `
        [HINT]
        <Short hint only>
        ` : ""}

        ${mode === "Full Solution" || mode === "Multiple Approaches" ? `
        [SOLUTION]
        <Only executable ${language} code here>
        ` : ""}
        `}

        STRICT RULES:
        - Do NOT add anything outside these markers.
        - Do NOT use decorative formatting.
        - Do NOT include extra commentary.
        - Do NOT include explanations outside sections.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.6,
        });

        let rawText = response.choices[0].message.content || "No content generated.";

        // 🔥 Cleanup Layer
        rawText = rawText
        // Remove lines that are ONLY separators like ===== or -----
        .replace(/^\s*[=-]{3,}\s*$/gm, "")
        .replace(/Question:/gi, "")
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
