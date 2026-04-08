# Code-Arena

**Code Arena** is a real-time collaborative coding platform, inspired by how Skribbl works, built for pairs and small teams to practice DSA problems colaboaratively. LeetCode — but live, with friends, a voice chat, a shared whiteboard, and an AI judge that scores your code on the spot.

## Features at a Glance

- Google Sign-In or anonymous join via session ID
- Driver-based coding model — one person codes, everyone collaborates
- 2500+ actual LeetCode problems derived using LeetCode Query API
- Each person gets a chance in rotation, similar to Skribbl, and has to code a problem as per the selected time limit.
- AI-powered judge evaluates code correctness, complexity, and edge cases, and provides useful insights using time and space complexity.
- Live voice chat between participants (WebRTC)
- Real-time collaborative whiteboard while solving the problem.
- Live group chat synced across all participants
- Round history with per-problem AI analysis and team score
- Real time DB where updates are made using Firebase Real Time DB

### Login 
The entry point. You just need to have a Google Account to create a new room using a unique room ID. You can also join an existing room using an existing room ID provided by your friends.

<img width="1891" height="917" alt="image" src="https://github.com/user-attachments/assets/ecf265f7-40f8-4198-bbd9-440f50d6cc0a" />
<img width="605" height="424" alt="image" src="https://github.com/user-attachments/assets/9c1cb325-a245-46d4-ac54-3b01e51ca0b0" />



### Lobby
Where the host configures the session before it starts — set the timer duration for each problem, max number of problems in one session(depending on no of participants, note: once selected this no cant be changed during the whole game session), and see who's joined. Participants wait in the lobby until the host starts the session.
Once joined, one of the participants will be able to see the Problem Picking Window, where they can choose which topic they want to practice, and what difficulty.

<img width="1857" height="907" alt="image" src="https://github.com/user-attachments/assets/799a209d-305f-420b-a6d9-a8cb2ce4eb02" />



### Room
The main coding arena. Split into three panels:

- **Problem Panel** — displays the active DSA problem with full description
- **Editor Panel** — a collaborative integrated Monaco code editor synced in real time across all participants, with language selection, a countdown timer, and run/submit controls. Only the driver is allowed to submit the code or run it, other users or guests can only see whats happening. There is also an integrated whiteboard where users can do some visualisations and practice dry runs. 
- **Chat + Voice Panel** — live group chat and one-click WebRTC voice chat which enables users to join the voice chat rooms, and communicate with each other.
<img width="1919" height="912" alt="image" src="https://github.com/user-attachments/assets/4a502aaf-5d15-44ce-bb70-b4340f61521d" />
<img width="1919" height="906" alt="image" src="https://github.com/user-attachments/assets/74c4b5ec-e0f5-4944-999b-a7cf871b58a2" />


### Round Score
Shown after code is submitted. Displays the AI judge's verdict — overall status (Accepted / WA / TLE), score out of 100, time and space complexity, a per-test-case report, and a short analysis of what went right or wrong.
<img width="818" height="708" alt="image" src="https://github.com/user-attachments/assets/1e967734-cd82-4265-a569-991e792918fb" />



### Round History
A session recap shown at the end of the session. Lists every problem attempted, who drove it, whether it was accepted, and the AI's analysis for each round. Shows the team's overall success rate.
<img width="1919" height="910" alt="image" src="https://github.com/user-attachments/assets/25ae0d3f-e1fd-491b-99a8-838f74db57cc" />


---

## 🏛️ Architecture

Code Arena is a **monorepo** consisting of a React frontend, an Express backend, and Firebase as the real-time data and auth layer. The two are deployed independently — the frontend can be hosted on any static host (e.g., Vercel), and the backend runs on Node.js with its own `vercel.json` for serverless deployment.

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                       │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  React + Vite Frontend                  │   │
│  │                                                         │   │
│  │  login_page ──► lobby ──► room ──► results              │   │
│  │                            │                            │   │
│  │              ┌─────────────┼──────────────┐             │   │
│  │              │             │              │             │   │
│  │          problem.jsx   editor.jsx      chat.jsx         │   │
│  │              │         (Monaco)     voicechat.jsx       │   │
│  │          prob_picker    timer.jsx   whiteboard.jsx      │   │
│  │          prob_score                                     │   │
│  └──────────────┬──────────────────────────────────────────┘   │
│                 │                                              │
│       ┌─────────┴──────────┐                                   │
│       │   src/services/    │                                   │
│       │  firebase.jsx      │  ◄──── Real-time DB & Auth        │
│       │  api.js            │  ◄──── REST calls to backend      │ 
│       └────────────────────┘                                   │
└────────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐           ┌────────────────────────────┐
│   Firebase Services  │           │   Node.js / Express        │
│                      │           │        Backend             │
│  ┌────────────────┐  │           │                            │
│  │ Realtime DB    │  │           │  server.js                 │
│  │ (room state,   │  │           │  routes.js                 │
│  │  code sync,    │  │           │  controller.js             │
│  │  chat, scores) │  │           │                            │
│  └────────────────┘  │           │  ┌──────────────────────┐  │
│                      │           │  │ config/              │  │
│  ┌────────────────┐  │           │  │ firebase-admin.js    │  │
│  │  Firebase Auth │  │           │  └──────────────────────┘  │
│  │  (Google +     │  │           │                            │
│  │   Anonymous)   │  │           │  problem_set.json          │
│  └────────────────┘  │           │  (2500+ LeetCode problems) │
└──────────────────────┘           └────────────────────────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │  Google Gemini 2.5    │
                                  │  Flash (AI Judge)     │
                                  │                       │
                                  │ • Correctness verdict │
                                  │ • Time/space analysis │
                                  │ • Edge case feedback  │
                                  │ • Score out of 100    │
                                  └───────────────────────┘
```

### Real-Time Data Flow

```
User submits code
       │
       ▼
  editor.jsx  ──► POST /api/judge  ──► controller.js
                                           │
                                           ▼
                                    Gemini 2.5 Flash
                                           │
                                     verdict JSON
                                           │
                                           ▼
                               Firebase Realtime DB
                               (scores/<roomId>/rounds)
                                           │
                            ┌──────────────┴──────────────┐
                            ▼                             ▼
                     prob_score.jsx               results.jsx
                   (live score popup)          (session history)
```

### Voice Chat (WebRTC)

```
Participant A                              Participant B
     │                                          │
  getUserMedia()                         getUserMedia()
     │                                          │
  simple-peer ◄──── Signaling via ────► simple-peer
                   Firebase RTDB
                  (offer/answer/ICE)
     │                                          │
  RTCPeerConnection ◄──── P2P Audio ────► RTCPeerConnection
```

---

## 📁 Project Structure

```
Code-Arena/
│
├── backend/                        # Node.js + Express API server
│   ├── config/
│   │   └── firebase-admin.js       # Firebase Admin SDK initialisation
│   ├── controller.js               # Route handler logic (AI judge, problem fetch)
│   ├── routes.js                   # Express route definitions
│   ├── server.js                   # App entry point — HTTP server bootstrap
│   ├── problem_set.json            # Cached LeetCode problem dataset (2500+ entries)
│   ├── vercel.json                 # Vercel serverless deployment config
│   ├── package.json
│   └── package-lock.json
│
├── public/                         # Static public assets (favicons, etc.)
│
├── src/                            # React frontend source
│   ├── assets/                     # Images, icons, static media
│   │
│   ├── pages/
│   │   ├── login_page.jsx          # Auth page — Google / anonymous sign-in
│   │   ├── HomePage.jsx            # Landing / create-or-join room UI
│   │   ├── lobby.jsx               # Pre-session lobby — timer config, participants
│   │   ├── scores.js               # Scoring helpers / utilities
│   │   │
│   │   └── room/                   # Main coding arena (all panels)
│   │       ├── room.jsx            # Root room orchestrator — layout & state
│   │       ├── problem.jsx         # Problem description panel
│   │       ├── editor.jsx          # Monaco code editor — real-time collaborative
│   │       ├── timer.jsx           # Round countdown timer
│   │       ├── prob_picker.jsx     # Problem selection dialog (topic + difficulty)
│   │       ├── prob_score.jsx      # AI judge score popup after submission
│   │       ├── results.jsx         # End-of-session round history view
│   │       ├── chat.jsx            # Live group text chat
│   │       ├── voicechat.jsx       # WebRTC voice room (simple-peer)
│   │       ├── whiteboard.jsx      # Real-time collaborative drawing canvas
│   │       └── scrollbar.css       # Custom scrollbar styling
│   │
│   ├── services/
│   │   ├── firebase.jsx            # Firebase init, auth helpers, DB refs
│   │   └── api.js                  # Axios/fetch wrappers for backend REST calls
│   │
│   ├── App.jsx                     # React Router setup & app shell
│   ├── App.css                     # Global app styles
│   ├── main.jsx                    # ReactDOM render entry point
│   └── index.css                   # Base / Tailwind CSS imports
│
├── index.html                      # Vite root HTML template
├── vite.config.js                  # Vite build configuration
├── postcss.config.js               # PostCSS / TailwindCSS configuration
├── eslint.config.js                # ESLint flat config
├── package.json                    # Frontend dependencies & scripts
├── package-lock.json
├── code_colab_icon.svg             # App logo / favicon source
├── README.md
└── TODO.md                         # Pending feature & fix tracker
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite | Component-based UI with fast HMR builds |
| **Styling** | TailwindCSS + PostCSS | Utility-first responsive styling |
| **Code Editor** | Monaco Editor | VS Code-grade in-browser editor with language support |
| **Backend** | Node.js + Express | REST API for AI judging and problem serving |
| **Real-Time DB** | Firebase Realtime Database | Live room state, code sync, chat, scores |
| **Authentication** | Firebase Auth | Google OAuth + Anonymous session login |
| **AI Judge** | Google Gemini 2.5 Flash | Code correctness, complexity, edge-case analysis |
| **Voice Chat** | WebRTC + simple-peer | Peer-to-peer audio with Firebase signaling |
| **Problem Bank** | LeetCode Query API | 2500+ sourced and cached DSA problems |
| **Deployment** | Vercel (backend + frontend) | Serverless functions for API, static for frontend |
| **Linting** | ESLint (flat config) | Code quality enforcement |

---

## 🎮 How It Works

### Session Flow

```
1. Login          ─►  Google / anonymous auth via Firebase
2. Home Page      ─►  Create a new room (unique ID) or join an existing one
3. Lobby          ─►  Host sets timer duration and max problem count
                       A participant opens the Problem Picker — selects topic & difficulty
4. Room (Active)  ─►  Current driver sees the problem + owns the editor
                       All others view code in real time (read-only)
                       Whiteboard is collaborative for everyone
                       Voice chat and group chat are always available
5. Submit         ─►  Driver submits; backend calls Gemini API
                       AI verdict appears as a score popup for all participants
6. Rotate         ─►  Next participant becomes the driver; new problem is picked
7. End            ─►  Round History shows every problem, driver, status, and AI notes
```

### Panel Layout — Room View

```
┌──────────────────────────────────────────────────────────┐
│                        Room                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐   │
│  │  Problem Panel  │  │ Editor Panel │  │ Chat+Voice │   │
│  │                 │  │              │  │   Panel    │   │
│  │ • Problem title │  │ Monaco Editor│  │            │   │
│  │ • Description   │  │ (real-time   │  │ • Group    │   │
│  │ • Examples      │  │  sync for    │  │   chat     │   │ 
│  │ • Constraints   │  │  all users)  │  │            │   │
│  │                 │  │              │  │ • Voice    │   │
│  │                 │  │ • Language   │  │   rooms    │   │
│  │                 │  │   selector   │  │   (WebRTC) │   │
│  │                 │  │ • Timer      │  │            │   │
│  │                 │  │ • Run/Submit │  │            │   │ 
│  │                 │  │              │  │            │   │
│  │                 │  │ ───────────  │  │            │   │
│  │                 │  │ Whiteboard   │  │            │   │
│  │                 │  │ (shared      │  │            │   │
│  │                 │  │  canvas)     │  │            │   │
│  └─────────────────┘  └──────────────┘  └────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### AI Judge — Score Output

After a submission, Gemini 2.5 Flash returns a structured verdict:

```json
{
  "status": "Accepted | Wrong Answer | Time Limit Exceeded",
  "score": 87,
  "time_complexity": "O(n log n)",
  "space_complexity": "O(n)",
  "test_cases": [
    { "case": 1, "passed": true },
    { "case": 2, "passed": true },
    { "case": 3, "passed": false, "note": "Edge case: empty input" }
  ],
  "analysis": "Good use of sorting. Edge case on empty array missed."
}
```
---
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/harshitzofficial/Code-Arena)



## To see logs for the Backend only:

docker logs -f backend-backend-1
## To see logs for the Judge0 Server (to see if it's crashing):

docker logs -f backend-judge0-server-1

## To see logs for EVERYTHING at once (Best for debugging flow):

docker-compose logs -f
(The -f flag stands for "follow," which keeps the terminal open and live).


docker-compose down
docker-compose up -d

## Restarting backend
docker-compose restart backend