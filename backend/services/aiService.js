import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// 1. Initialize the AI once at the top level
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Define the 'model' here so ALL functions can see it
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
});

/**
 * Acts as a Senior Code Reviewer to analyze Time/Space complexity AFTER deterministic execution.
 */
export async function analyzeCodeComplexity(code, language, problem, judge0Results) {
    console.log(`[AI Service] Analyzing complexity for ${problem.title}...`);
    
    try {
        const prompt = `
            ### ROLE: Senior Code Reviewer
            ### CONTEXT:
            - Problem: ${problem.title}
            - Language: ${language}
            - User Code: """${code}"""
            - Execution Results: The code achieved a status of "${judge0Results.status}".
            
            ### TASK:
            Provide a strict Big-O complexity analysis and brief feedback on code quality/optimizations.

            ### OUTPUT FORMAT:
            Return ONLY JSON:
            {
              "complexity": { "time": "O(...)", "space": "O(...)" },
              "analysis": "Brief, professional feedback on the code structure and efficiency."
            }
        `;

        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());

    } catch (error) {
        console.error("[AI Service] Analysis failed:", error);
        return { complexity: { time: "N/A", space: "N/A" }, analysis: "Analysis unavailable." };
    }
}