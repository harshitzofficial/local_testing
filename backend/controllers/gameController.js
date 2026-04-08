import * as gameService from '../services/gameService.js';
import * as aiService from '../services/aiService.js';
import * as executionService from '../services/executionService.js';
import { normalizeTestCases } from '../utils/helpers.js';
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
    'cpp': 54,
    'java': 62,
    'python': 71,
    'javascript': 93
};

// 2. Status IDs to Readable Strings (FIXES THE CRASH)
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
            return pDiff === targetDiff && pTags.includes(targetTopic);
        });

        if (filtered.length === 0) {
            return res.status(404).json({ success: false, error: `No match for ${difficulty} + ${topic}.` });
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
        const languageId = LANGUAGE_MAPPING[language.toLowerCase()];
        
        if (!languageId) return res.status(400).json({ success: false, message: "Unsupported language" });

        // 1. AI GENERATES TEST CASES
        let raw_cases = await aiService.fetchTestCasesFromAI(problem, 5);
        const test_cases = normalizeTestCases(raw_cases);

        if (!test_cases || test_cases.length === 0) {
            return res.status(503).json({ 
                success: false, 
                error: "AI Test Case Generator is unavailable. Try again in a moment." 
            });
        }

        // 2. COMPILER EXECUTION (Judge0)
        const tokens = await executionService.submitBatch(test_cases, code, languageId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const rawResults = await executionService.getBatchResults(tokens);
        
        // 3. GENERATE TEST REPORT (Uses STATUS_MAPPING now)
        const testReport = rawResults.map((r, index) => ({
            case: index + 1,
            passed: r.status_id === 3, 
            input: test_cases[index].stdin,
            expected: test_cases[index].expected,
            actual: r.stdout ? r.stdout.trim() : (r.stderr || r.compile_output || "Error"),
            time: r.time,
            status: STATUS_MAPPING[r.status_id] || "Unknown"
        }));

        const allPassed = testReport.every(t => t.passed);
        const overallStatus = allPassed ? "Accepted" : "Wrong Answer";

        // 4. RESILIENT AI REVIEW
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
        
        // 5. SAVE & RESPOND
        if (is_run) await gameService.saveRunCodeResults(roomId, finalResults);
        else await gameService.saveSubmitCodeResults(roomId, finalResults);

        res.status(200).json({ success: true, results: finalResults });

    } catch (error) {
        console.error("❌ Execute Error:", error.message);
        res.status(500).json({ success: false, error: "Internal Server Error." });
    }
};