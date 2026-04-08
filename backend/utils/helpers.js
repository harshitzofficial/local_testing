// backend/utils/helpers.js

/**
 * Normalizes test cases from Gemini to ensure strict string matching.
 * Trims whitespace and handles Windows carriage returns (\r\n) vs Linux (\n).
 * * @param {Array} testCases - Array of test case objects from the AI
 * @returns {Array} - Cleaned array of test cases
 */
export const normalizeTestCases = (testCases) => {
    // ✅ If input is missing or not an array, return an empty array without crashing
    if (!testCases || !Array.isArray(testCases)) {
        return [];
    }

    return testCases.map(tc => ({
        stdin: String(tc.stdin || ""),
        expected: String(tc.expected || "").trim()
    }));
};