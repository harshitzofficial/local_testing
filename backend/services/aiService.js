import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();

// 1. Initialize the AI once at the top level
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Define the 'model' here so ALL functions can see it
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" }
});

/**
 * Prompts Gemini to generate robust test cases based on the sample input.
 */
export const fetchTestCasesFromAI = async (problem, count = 5) => {
    try {
        console.log(`[AI Service] Generating ${count} test cases for: ${problem.title}`);

        const prompt = `
            Act as a competitive programming judge. 
            Generate ${count} diverse test cases for the problem: "${problem.title}".
            The problem description is: ${problem.content || "Standard LeetCode " + problem.title}
            
            Return ONLY a valid JSON array of objects. 
            Each object must have 'stdin' (string) and 'expected' (string) keys.
            Example format: [{"stdin": "2 7 11 15\\n9", "expected": "[0,1]"}]
        `;

        // Now 'model' is defined and accessible!
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("[AI Service] Raw Response:", text);

        // Since we set responseMimeType to application/json, we can parse directly
        return JSON.parse(text);

    } catch (error) {
        console.error("❌ [AI Service] Gemini Error:", error.message);
        return null; 
    }
};

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