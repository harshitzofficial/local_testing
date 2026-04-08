import * as gameService from '../services/gameService.js';
import * as aiService from '../services/aiService.js';
import * as executionService from '../services/executionService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- DATA INITIALIZATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const problemsPath = path.join(__dirname, '../problem_set.json');

const rawData = JSON.parse(fs.readFileSync(problemsPath, 'utf8'));
const allProblems = rawData.problems || []; 

console.log(`[Controller] Loaded ${allProblems.length} problems from JSON.`);

// 1. Language IDs for Judge0
const LANGUAGE_MAPPING = {
    'c++': 54,
    'cpp': 54,
    'c#': 51,
    'java': 62,
    'python': 71,
    'python3': 71,
    'javascript': 93,
    'c': 50,
    'csharp': 51,
    'ruby': 72,
    'swift': 83,
    'go': 60,
    'kotlin': 78,
    'rust': 73,
    'php': 68,
    'typescript': 94
};

// 2. Status IDs to Readable Strings
const STATUS_MAPPING = {
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error'
};

// --- HELPER: AUTOMATED DRIVER WRAPPER ---
// 🚀 THE BULLETPROOF WRAPPER
const wrapCode = (userCode, language, problem) => {
    const lang = language.toLowerCase();
    
    if (lang === 'javascript' || lang === 'typescript') {
        const nameMatch = userCode.match(/(?:var|let|const|function)\s+(\w+)/);
        const fnName = nameMatch ? nameMatch[1] : "solution";

        return `
${userCode}

// --- Automated Driver Code ---
const fs = require('fs');
try {
    const inputRaw = fs.readFileSync(0, 'utf8').trim();
    if (!inputRaw) {
        process.stdout.write("Driver Error: No input received from Judge0.");
        process.exit(0);
    }
    
    const input = inputRaw.split('\\n');
    const parsedArgs = input.map(arg => {
        try { return JSON.parse(arg); } catch { return arg; }
    });

    if (typeof ${fnName} === 'function') {
        const result = ${fnName}(...parsedArgs);
        
        // 🚀 THE FIX: Gracefully handle empty returns
        if (result === undefined) {
            process.stdout.write("undefined");
        } else {
            process.stdout.write(JSON.stringify(result));
        }
    } else {
        process.stdout.write("Driver Error: Function '${fnName}' not found.");
    }
} catch (e) {
    // 🚀 THE FIX: Print internal errors directly to the Actual output screen
    process.stdout.write("Driver Error: " + e.message);
}
        `;
    }
    
    if (lang === 'python' || lang === 'python3') {
        return `
import sys, json
${userCode}

# --- Automated Driver Code ---
try:
    lines = sys.stdin.readlines()
    args = [json.loads(line.strip()) for line in lines]
    sol = Solution()
    method_name = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))][0]
    result = getattr(sol, method_name)(*args)
    # Handle None properly
    if result is None:
        print("None", end='')
    else:
        print(json.dumps(result), end='')
except Exception as e:
    print("Driver Error: " + str(e), end='')
        `;
    }

    return userCode;
};

// --- CONTROLLER FUNCTIONS ---

export const createGame = async (req, res) => {
    try {
        const { roomId } = req.query;
        if (!roomId) return res.status(400).json({ success: false, message: "roomId is required" });
        await gameService.initGame(roomId);
        res.status(200).json({ success: true, message: "Game started" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const nextRound = async (req, res) => {
    try {
        const { roomId } = req.query;
        await gameService.initiatenextRound(roomId);
        res.status(200).json({ success: true, message: "Next round started" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const fetchProblem = async (req, res) => {
    try {
        const { roomId, difficulty, topic } = req.query;
        const targetDiff = difficulty.toLowerCase().trim();
        const targetTopic = topic.toLowerCase().trim();

        const filtered = allProblems.filter(p => {
            const pDiff = (p.difficulty || "").toLowerCase().trim();
            const pTags = Array.isArray(p.topicTags) 
                ? p.topicTags.map(tag => (tag.name || "").toLowerCase().trim())
                : [];
            const hasContent = p.content && typeof p.content === 'string' && p.content.trim() !== "";
            return pDiff === targetDiff && pTags.includes(targetTopic) && hasContent;
        });

        if (filtered.length === 0) {
            return res.status(404).json({ success: false, error: `No match found.` });
        }

        const problem = filtered[Math.floor(Math.random() * filtered.length)];
        await gameService.setProblem(roomId, problem);
        res.json({ success: true, problem });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const executeCode = async (req, res) => {
    try {
        const { problem, roomId, code, language, is_run } = req.body;
        
        if (!problem || !problem.title) {
            return res.status(400).json({ success: false, error: "Problem details missing." });
        }

        if (!code || code.trim() === "") {
            return res.status(400).json({ success: false, error: "Code is empty." });
        }

        const languageId = LANGUAGE_MAPPING[language.toLowerCase()];
        if (!languageId) return res.status(400).json({ success: false, message: `Unsupported language: ${language}` });

        const test_cases = problem.testCases;
        if (!test_cases || test_cases.length === 0) {
            return res.status(400).json({ success: false, error: "No test cases found." });
        }

        // 🚀 THE WRAPPER: Apply the Automated Driver Code
        const wrappedCode = wrapCode(code, language, problem);

        // 2. COMPILER EXECUTION (Using the wrapped code)
        const tokens = await executionService.submitBatch(test_cases, wrappedCode, languageId);
        
        // 🚀 THE FIX: A Proper Polling Loop
        let rawResults = [];
        let attempts = 0;
        const maxAttempts = 15; // Give it up to 15 seconds to finish

        while (attempts < maxAttempts) {
            // Wait 1 second before asking Judge0 for an update
            await new Promise(resolve => setTimeout(resolve, 1000)); 
            
            rawResults = await executionService.getBatchResults(tokens);
            
            // Check if ALL test cases are done. 
            // 1 = In Queue, 2 = Processing. Anything else (3, 4, 5, 6) means it finished!
            const allFinished = rawResults.every(r => r.status_id !== 1 && r.status_id !== 2);
            
            if (allFinished) {
                break; // Exit the loop, Judge0 is done!
            }
            
            attempts++;
        }

        
        // 3. GENERATE TEST REPORT
        const testReport = rawResults.map((r, index) => {
            
            // 🚀 THE FIX: If stdout is empty, aggressively hunt down the reason why
            let actualOutput = r.stdout ? r.stdout.trim() : "";
            
            if (!actualOutput) {
                // Grab the error log, compilation log, message, or fallback to the Status ID
                actualOutput = r.stderr || r.compile_output || r.message || `Killed by Judge0 (Status Code: ${r.status_id})`;
            }

            return {
                case: index + 1,
                passed: r.status_id === 3, 
                input: test_cases[index].stdin,
                expected: test_cases[index].expected,
                actual: actualOutput,
                time: r.time,
                status: STATUS_MAPPING[r.status_id] || "Unknown"
            };
        });

        const allPassed = testReport.every(t => t.passed);
        const overallStatus = allPassed ? "Accepted" : "Wrong Answer";

        let aiReview = { complexity: { time: "N/A", space: "N/A" }, analysis: "AI Review unavailable." };
        try {
            const review = await aiService.analyzeCodeComplexity(code, language, problem, { status: overallStatus });
            if (review) aiReview = review;
        } catch (aiErr) {
            console.error("⚠️ AI Review failed:", aiErr.message);
        }

        const finalResults = {
            overallStatus,
            score: allPassed ? 100 : 0,
            complexity: aiReview.complexity,
            analysis: aiReview.analysis,
            testReport
        };
        
        if (is_run) await gameService.saveRunCodeResults(roomId, finalResults);
        else await gameService.saveSubmitCodeResults(roomId, finalResults);

        res.status(200).json({ success: true, results: finalResults });

    } catch (error) {
        console.error("❌ Execute Error:", error.message);
        res.status(500).json({ success: false, error: "Internal Server Error." });
    }
};