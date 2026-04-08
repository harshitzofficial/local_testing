import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, remove, get, onValue, child, push, update, onChildAdded } from "firebase/database";
import { createContext, useContext } from "react";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 1. Initialize immediately at the top
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getDatabase(app);

const Firebasecontext = createContext(null);

// --- Realtime Database Functions ---

// Note: Use the 'db' instance we created at the top for efficiency
function subscribeToRoom(roomId, callback) {
  const roomRef = ref(db, `root/rooms/${roomId}`);
  return onValue(roomRef, (snapshot) => callback(snapshot.val()));
}

function subscribeToEditor(roomId, callback) {
  const roomRef = ref(db, `root/liveContent/${roomId}/editor/`);
  return onValue(roomRef, (snapshot) => callback(snapshot.val()));
}

function writeCode(roomId, data, link = '') {
  return update(ref(db, `root/liveContent/${roomId}/editor/${link}`), data);
}

function subscribeToChat(roomId, callback) {
  const roomRef = ref(db, `root/liveContent/${roomId}/chat/`);
  return onChildAdded(roomRef, (snapshot) => callback(snapshot.val()));
}

async function sendMsg(roomId, data) {
  return push(ref(db, `root/liveContent/${roomId}/chat/`), data);
}

const getRoomData = async (roomId, path = '') => {
  const dbRef = ref(db);
  const snapshot = await get(child(dbRef, `root/rooms/${roomId}/${path}`));
  return snapshot.exists() ? snapshot.val() : null;
};

async function updateRoomData(data, room_id, path) {
  return update(ref(db, `root/rooms/${room_id}/${path}`), data);
}

function writeUserData(data, link) {
  return set(ref(db, 'root/users/' + link), data);
}

function writeRoomData(data, link) {
  return set(ref(db, 'root/rooms/' + link), data);
}

// --- Whiteboard Functions ---

async function pushWhiteboardStroke(roomId, stroke) {
  return push(ref(db, `root/liveContent/${roomId}/whiteboard/strokes`), stroke);
}

function subscribeToWhiteboardStrokes(roomId, onStroke) {
  return onChildAdded(ref(db, `root/liveContent/${roomId}/whiteboard/strokes`), (snapshot) => {
    onStroke({ key: snapshot.key, stroke: snapshot.val() });
  });
}

function subscribeToWhiteboardClear(roomId, onClear) {
  return onValue(ref(db, `root/liveContent/${roomId}/whiteboard/strokes`), (snapshot) => {
    if (!snapshot.exists()) onClear();
  });
}

async function clearWhiteboard(roomId) {
  return remove(ref(db, `root/liveContent/${roomId}/whiteboard/strokes`));
}

// --- Auth Functions ---

const handleGoogleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Auth Error:", error.message);
    return null;
  }
};

export const ensureAnonymousUser = () => {
  return new Promise((resolve, reject) => {
    signInAnonymously(auth)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        });
      })
      .catch(reject);
  });
};

export const FirebaseProvider = (props) => {
  return (
    <Firebasecontext.Provider value={{ 
      handleGoogleSignIn, sendMsg, subscribeToEditor, subscribeToChat, 
      writeCode, subscribeToRoom, updateRoomData, writeRoomData, 
      writeUserData, getRoomData, ensureAnonymousUser, pushWhiteboardStroke, 
      subscribeToWhiteboardStrokes, subscribeToWhiteboardClear, clearWhiteboard 
    }}>
      {props.children}
    </Firebasecontext.Provider>
  )
};

export const useFirebase = () => useContext(Firebasecontext);