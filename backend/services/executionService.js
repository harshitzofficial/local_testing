// backend/services/executionService.js

// Uses the Docker network URL if deployed via docker-compose, otherwise falls back to local port
const JUDGE0_BASE_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

/**
 * Formats the code and test cases into the payload expected by Judge0's batch submission endpoint.
 * @param {Array} testCases - Array of test case objects {stdin, expected}
 * @param {string} code - The source code to execute
 * @param {number} languageId - The Judge0 language ID (e.g., 71 for Python, 54 for C++)
 * @returns {Object} - Formatted payload
 */
export function buildBatchRequest(testCases, code, languageId) {
    if (!testCases || testCases.length === 0) {
        throw new Error("No test cases provided for execution.");
    }

    return {
        submissions: testCases.map(tc => ({
            source_code: code,
            language_id: languageId,
            stdin: tc.stdin,
            expected_output: tc.expected
        }))
    };
}

/**
 * Submits a batch of code executions to the local Judge0 instance.
 * @param {Array} testCases - Array of formatted test cases
 * @param {string} code - User's code
 * @param {number} languageId - Judge0 language ID
 * @returns {Promise<Array>} - Array of submission tokens
 */
export async function submitBatch(testCases, code, languageId) {
    const body = buildBatchRequest(testCases, code, languageId);
    console.log(`[Execution Service] Calling Judge0 at ${JUDGE0_BASE_URL}/submissions/batch...`);
    
    try {
        const response = await fetch(
            `${JUDGE0_BASE_URL}/submissions/batch?base64_encoded=false`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
             throw new Error(`Judge0 API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[Execution Service] Successfully submitted ${result.length} test cases to queue.`);
        
        // Return just the tokens. We use these tokens to ask Judge0 for the results.
        return result.map(r => r.token);
    } catch (error) {
        console.error("[Execution Service] Failed to reach compiler:", error);
        throw error;
    }
}

/**
 * Fetches the actual results of a batch submission using the generated tokens.
 * @param {Array<string>} tokens - Array of submission tokens
 * @returns {Promise<Array>} - Execution results (stdout, stderr, memory, time, etc.)
 */
export async function getBatchResults(tokens) {
    if (!tokens || tokens.length === 0) return [];
    
    const tokenString = tokens.join(",");
    console.log(`[Execution Service] Fetching execution results for ${tokens.length} tokens...`);

    try {
        // Request specific fields to keep the payload lightweight and fast
        const response = await fetch(
            `${JUDGE0_BASE_URL}/submissions/batch?tokens=${tokenString}&base64_encoded=false&fields=token,status_id,compile_output,stdout,stderr,time,memory`,
            { method: 'GET' }
        );

        if (!response.ok) {
            throw new Error(`Judge0 API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.submissions;
    } catch (error) {
        console.error("[Execution Service] Failed to fetch batch results:", error);
        throw error;
    }
}
