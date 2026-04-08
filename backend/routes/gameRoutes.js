// backend/routes/gameRoutes.js

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import * as gameController from '../controllers/gameController.js';

const router = express.Router();

// ==========================================
// GAME MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /createGame
 * @desc    Initializes a new room, fetches tags, and assigns the first driver
 * @access  Protected (Requires Firebase Token)
 */
router.get('/createGame', verifyToken, gameController.createGame);

/**
 * @route   GET /nextRound
 * @desc    Rotates the driver and increments the round counter
 * @access  Protected (Requires Firebase Token)
 */
router.get('/nextRound', verifyToken, gameController.nextRound);

/**
 * @route   GET /fetchProblem
 * @desc    Selects an unseen problem based on topic and difficulty
 * @access  Protected (Requires Firebase Token)
 */
router.get('/fetchProblem', verifyToken, gameController.fetchProblem);

// ==========================================
// CODE EXECUTION ROUTES
// ==========================================

/**
 * @route   POST /runCode
 * @desc    Executes user code via Judge0 and analyzes complexity via AI
 * @access  Protected (Requires Firebase Token)
 */
router.post('/runCode', verifyToken, gameController.executeCode);


export { router as gameRoutes };