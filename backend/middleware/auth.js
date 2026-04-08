// backend/middleware/auth.js

import { auth } from '../config/firebase-admin.js';

/**
 * Middleware to verify Firebase ID tokens.
 * Protects routes from unauthorized access.
 */
export const verifyToken = async (req, res, next) => {
    try {
        // 1. Check if the Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn("[Auth] Missing or improperly formatted Authorization header");
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: No token provided" 
            });
        }

        // 2. Extract the token from the "Bearer <token>" string
        const token = authHeader.split(' ')[1];

        // 3. Verify the token using Firebase Admin
        const decodedToken = await auth.verifyIdToken(token);

        // 4. Attach the decoded user information to the request object
        // This allows your controllers to know exactly who made the request (e.g., req.user.uid)
        req.user = decodedToken;

        // 5. Move to the next middleware or controller function
        next();

    } catch (error) {
        console.error("[Auth] Token verification failed:", error.message);
        
        // Differentiate between expired tokens and invalid tokens for better frontend debugging
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: Token has expired" 
            });
        }

        return res.status(401).json({ 
            success: false, 
            message: "Unauthorized: Invalid token" 
        });
    }
};