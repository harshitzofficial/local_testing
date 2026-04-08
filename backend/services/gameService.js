// backend/services/gameService.js

import { db } from "../config/firebase-admin.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Resolve the path to problem_set.json in the root backend folder
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const problemSetPath = path.join(__dirname, '../problem_set.json');

// 2. Load the problem set into memory exactly once when the server starts
// 2. Load the problem set into memory exactly once when the server starts
let problemSet = [];
try {
    const rawData = fs.readFileSync(problemSetPath, 'utf8');
    let parsedData = JSON.parse(rawData);

    // SAFEGUARD: Convert to an array if the JSON is an object
    if (!Array.isArray(parsedData)) {
        // If it's wrapped in a 'questions' or 'problems' key
        if (parsedData.questions) {
            problemSet = parsedData.questions;
        } else if (parsedData.problems) {
            problemSet = parsedData.problems;
        } else {
            // Otherwise, just extract all the values from the object
            problemSet = Object.values(parsedData);
        }
    } else {
        problemSet = parsedData; // It was already an array
    }

    console.log(`[Game Service] Successfully loaded ${problemSet.length} problems from local JSON.`);
} catch (error) {
    console.error("[Game Service] Critical Error: Could not read problem_set.json", error);
}

/**
 * Initializes a game room, extracts available tags, and picks the first driver.
 */
export async function initGame(roomId) {
    console.log(`[Game Service] Initializing game for room: ${roomId}`);
    
    // Extract all unique tags dynamically from your local JSON
    const allTags = [...new Set(problemSet.flatMap(prob => prob.tags || []))];
    
    await chooseDriver(roomId);
    return allTags;
}

/**
 * Selects a random problem matching the criteria from the local JSON that the room hasn't seen.
 */
// backend/services/gameService.js

export const setProblem = async (roomId, problem) => {
    // 1. Never let an undefined problem proceed
    if (!problem || !problem.titleSlug) {
        throw new Error("Backend Error: Selected problem is missing a slug.");
    }

    const roomRef = db.ref(`rooms/${roomId}`);
    const snapshot = await roomRef.once('value');
    const roomData = snapshot.val();

    // 2. Clean up the 'seenProbs' list. 
    // We use a Set to ensure unique values and filter out any 'null/undefined'
    let seenProbs = [];
    const existingProbs = roomData?.gameState?.seenProbs;

    if (existingProbs) {
        // This handles cases where Firebase sends back an object instead of an array
        const values = Array.isArray(existingProbs) ? existingProbs : Object.values(existingProbs);
        seenProbs = values.filter(p => typeof p === 'string' && p.length > 0);
    }

    // Add the new problem
    seenProbs.push(problem.titleSlug);

    // 3. The Update
    const updates = {
        'gameState/currentProblem': problem,
        'gameState/roundStatus': 'coding',
        'gameState/seenProbs': seenProbs,
        'gameState/judgeResults': null
    };

    // Use 'update' to strictly target the gameState without wiping the whole room
    return await roomRef.update(updates);
};
/**
 * Progresses the game to the next round or ends it if max rounds are reached.
 */
export async function initiatenextRound(roomId) {
    let roundSnap = await db.ref(`root/rooms/${roomId}/gameState/currentRound`).get();
    const currentRound = roundSnap.exists() ? roundSnap.val() : 1;
    
    let maxSnap = await db.ref(`root/rooms/${roomId}/config/max_prob`).get();
    const maxRounds = maxSnap.exists() ? maxSnap.val() : 1;

    if (currentRound >= maxRounds) {
        console.log(`[Game Service] Max rounds reached. Ending game for room ${roomId}`);
        await db.ref(`root/rooms/${roomId}/`).update({
            'gameState/gameStatus': "ended",
            'gameState/gameUrl': `/${roomId}/results/`
        });
    } else {
        console.log(`[Game Service] Starting next round for room ${roomId}`);
        await chooseDriver(roomId);
        await db.ref(`root/rooms/${roomId}/`).update({
            'gameState/roundStatus': 'initialising'
        });
    }
}

/**
 * Rotates the typing control (driver) alphabetically to the next participant.
 */
async function chooseDriver(roomId) {
    const roomSnap = await db.ref(`root/rooms/${roomId}`).get();
    if (!roomSnap.exists()) return;

    const gameState = roomSnap.val().gameState;
    const participantsObj = gameState.participants_list;
    const currentDriverId = gameState.driver_id;

    if (!participantsObj) return;

    // Sort to ensure consistent ordering across rotations
    const userIds = Object.keys(participantsObj).sort();
    const currentIndex = userIds.indexOf(currentDriverId);
    
    // Pick next index, wrap around to 0 if at the end
    const nextIndex = (currentIndex === -1 || currentIndex === userIds.length - 1) ? 0 : currentIndex + 1;
    const selectedDriverId = userIds[nextIndex];

    await db.ref(`root/rooms/${roomId}/gameState/driver_id`).set(selectedDriverId);
    console.log(`[Game Service] Room ${roomId} driver rotated to ${selectedDriverId}`);
}

/**
 * Saves the results of a "Run" action (sample test cases only).
 */
export async function saveRunCodeResults(roomId, results) {
    await db.ref(`root/rooms/${roomId}/`).update({
        'gameState/roundStatus': 'executed',
        'gameState/judgeResults': results
    });
    console.log(`[Game Service] Saved RUN results to Firebase for room ${roomId}`);
}

/**
 * Saves the results of a "Submit" action and logs it to the room's round history.
 */
export async function saveSubmitCodeResults(roomId, results) {
    const snapshot = await db.ref(`root/rooms/${roomId}/gameState/currentRound`).get();
    const currentRound = snapshot.exists() ? snapshot.val() : 1;
    
    const updates = {
        'gameState/roundStatus': 'submitted',
        'gameState/judgeResults': results, 
        [`roundHistory/${currentRound}`]: results // Crucial for your post-match analytics!
    };

    await db.ref(`root/rooms/${roomId}/`).update(updates);
    console.log(`[Game Service] Saved SUBMIT results and history for room ${roomId}`);
}