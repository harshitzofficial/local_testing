import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../credentials.env") });

import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

console.log("KEY START:", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 60));
console.log("HAS NEWLINES:", process.env.FIREBASE_PRIVATE_KEY?.includes('\n'));
console.log("HAS LITERAL \\n:", process.env.FIREBASE_PRIVATE_KEY?.includes('\\n'));

export const db = admin.database();
export const firestore = admin.firestore();
export const auth = admin.auth();

export default admin;
// ```

// And in your `credentials.env` (for local dev):
// ```
// FIREBASE_PROJECT_ID=colab-code-ed3cb
// FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@colab-code-ed3cb.iam.gserviceaccount.com
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...your full key...\n-----END PRIVATE KEY-----\n"
// FIREBASE_DATABASE_URL=https://colab-code-ed3cb-default-rtdb.firebaseio.com
