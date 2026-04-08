import { auth } from './firebase';
import { onAuthStateChanged } from "firebase/auth";

// 1. Use Environment Variables (Professional Standard)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Ensures we have a valid token even if the page was just refreshed.
 */
const getFirebaseToken = () => {
    return new Promise((resolve, reject) => {
        // If user is already "loaded" in memory, resolve immediately
        if (auth.currentUser) {
            resolve(auth.currentUser.getIdToken());
            return;
        }

        // Otherwise, wait for the first auth state change
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
                const token = await user.getIdToken();
                resolve(token);
            } else {
                reject("No user logged in");
            }
        }, reject);
    });
};

/**
 * Core Fetch Wrapper with Auth Injection
 */
const fetchWithAuth = async (endpoint, options = {}) => {
    try {
        const token = await getFirebaseToken();
        
        // Ensure endpoint doesn't start with a slash if apiUrl ends with one
        const url = `${apiUrl}/${endpoint.replace(/^\//, '')}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // The "VIP Pass"
                ...options.headers,
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error("❌ API Call Failed:", error.message);
        throw error;
    }
};

export const apiGet = (endpoint) => fetchWithAuth(endpoint, { method: 'GET' });
export const apiPost = (endpoint, data) => fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) });