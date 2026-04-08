import React, { useState, useEffect } from "react";
import Problem from "./problem";
import Editor from "./editor";
import ProblemPicker from "./prob_picker";
import ProblemScore from "./prob_score";
import Chat from "./chat";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useFirebase } from "../../services/firebase";
// import { auth } from "../../services/firebase";
import Whiteboard from "./whiteboard";
import VoiceChat from "./voicechat";
import { apiGet, apiPost } from "../../services/api"; // Ensure both are imported
function Room(props) {
  const navigate = useNavigate();
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const [focused, setFocused] = useState(null);
  const availableTopics = [
    "Array",
    "Hash Table",
    "Linked List",
    "Math",
    "Recursion",
    "String",
    "Sliding Window",
    "Binary Search",
    "Divide and Conquer",
    "Two Pointers",
    "Dynamic Programming",
    "Greedy",
    "Trie",
    "Sorting",
    "Backtracking",
    "Stack",
    "Heap (Priority Queue)",
    "Merge Sort",
    "String Matching",
    "Bit Manipulation",
    "Matrix",
    "Monotonic Stack",
    "Simulation",
    "Combinatorics",
    "Memoization",
    "Depth-First Search",
    "Tree",
    "Binary Tree",
    "Binary Search Tree",
    "Breadth-First Search",
    "Union Find",
    "Graph",
    "Design",
    "Doubly-Linked List",
    "Geometry",
    "Interactive",
    "Bucket Sort",
    "Radix Sort",
    "Counting",
    "Data Stream",
    "Iterator",
    "Database",
    "Rolling Hash",
    "Hash Function",
    "Shell",
    "Enumeration",
    "Number Theory",
    "Topological Sort",
    "Prefix Sum",
    "Quickselect",
    "Binary Indexed Tree",
    "Segment Tree",
    "Line Sweep",
    "Ordered Set",
    "Queue",
    "Monotonic Queue",
    "Counting Sort",
    "Brainteaser",
    "Game Theory",
    "Eulerian Circuit",
    "Bitmask",
    "Randomized",
    "Reservoir Sampling",
    "Shortest Path",
    "Rejection Sampling",
    "Probability and Statistics",
    "Suffix Array",
    "Concurrency",
    "Minimum Spanning Tree",
    "Biconnected Component",
    "Sort",
    "Strongly Connected Component",
  ];
  // const [participants, setParticipants] = useState(null);
  const [roundStatus, setRoundStatus] = useState("initialising");
  const [activeProblem, setProblem] = useState(null);
  let user_id = localStorage.getItem("id") || props.user_id;
  const [users, setUsers] = useState(null);

  const [driver_id, setDriver] = useState(null);
  const [driver_uname, setDriverName] = useState(null);

  const show_prob_screen = driver_id !== null && driver_id === user_id;

  const show_guest_screen = driver_id !== null && driver_id !== user_id;
  const [show_loading, updateLoading] = useState(true);
  const loadingMessage =
    show_guest_screen || show_prob_screen
      ? "Setting up the coding environment..."
      : "Loading the session for you...";
  const { roomId } = useParams();
  const f = useFirebase();
  // const [running, setRunning] = useState(false);
  const [results, setresults] = useState({});

  const [endTime, setTimer] = useState(Date.now());

  // const loading = true;

  const handleConfirmSelection = async (selectedDifficulty, selectedTopic) => {
    updateLoading(true);
    try {
      // Add 10s timeout to prevent infinite loading
      await Promise.race([
        apiGet(
          `fetchProblem?roomId=${roomId}&difficulty=${selectedDifficulty}&topic=${selectedTopic}`,
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Problem selection took too long')), 10000)
        )
      ]);
      console.log('✅ Problem selected successfully');
      updateLoading(false);  // ✅ Hide loading on SUCCESS
    } catch (error) {
      console.error("Selection failed:", error);
      updateLoading(false);  // ✅ Always hide loading
      alert(`Could not load problem: ${error.message}. Try another category or check backend.`);
    }
  };

// function updateScores() {} // unused

  async function startNewProblem() {
    if (driver_id !== user_id) return;

    try {
      updateLoading(true);
      // This rotates the driver and clears the old results in one go
      await apiGet(`nextRound?roomId=${roomId}`);

      // The Firebase subscription in useEffect will catch the status change
      // to "initialising" and show the ProblemPicker again.
    } catch (error) {
      console.error("Failed to start next round:", error);
    } finally {
      updateLoading(false);
    }
  }

  const handleRunCode = async (code, selectedLang, is_run = true) => {
    // 1. Tell Firebase we are now in the 'running' state (shows spinners to everyone)
    await f.updateRoomData({ "gameState/roundStatus": "running" }, roomId, "");

    const payload = {
      roomId: roomId,
      language: selectedLang,
      code: code,
      is_run: is_run,
      problem: {
        title: activeProblem.title,
        titleSlug: activeProblem.titleSlug,
      },
    };

    try {
      // 2. Call the new consolidated execution endpoint
      const data = await apiPost("runCode", payload);

      if (data.success) {
        // The backend already saved these results to Firebase,
        // but we can log them here for debugging.
        console.log("Execution successful:", data.results);
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (error) {
      console.error("Failed to run code:", error);

      // Fallback: If the API fails, move back to coding state so the user isn't stuck
      await f.updateRoomData({ "gameState/roundStatus": "coding" }, roomId, "");
      alert("AI/Compiler Error: " + error.message);
    }
  };

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const unsubscribe = f.subscribeToRoom(roomId, (roomData) => {
      if (!roomData || !roomData.gameState) {
        return;
      }

      try {
        const user_id = localStorage.getItem("id") || props.user_id;
        const participantsObj = roomData.gameState.participants_list;
        const gameState = roomData.gameState;

        const currentStatus = gameState.status || gameState.roundStatus;
        const currentProblem = gameState.currentProblem;
        const probResults = gameState.judgeResults;
        const gameStatus = gameState.gameStatus;
        const gameUrl = gameState.gameUrl;

        if (gameState?.timerEndTime) {
          setTimer(gameState?.timerEndTime);
        }

        if (gameStatus == "ended") {
          navigate(gameUrl);
        }

        if (!participantsObj) {
          console.warn("No participants list in game state");
          return;
        }

        setUsers(participantsObj);

        const participants = Object.keys(participantsObj);

        if (!participants.includes(user_id)) {
          alert("You have been removed or the room is closed.");
          return;
        }

        const currentDriverId = roomData.gameState.driver_id;

        setRoundStatus(currentStatus);
        setDriver(currentDriverId);
        setDriverName(participantsObj[currentDriverId]);
        // setParticipants(participants); // participants not used

        if (currentStatus === "initialising" && !currentProblem) {
          updateLoading(false);
        }

        // if( currentStatus == "initialising"){

        // }

        if (currentStatus === "coding" && currentProblem) {
          setProblem(currentProblem);
          updateLoading(false);
        }

        if (currentStatus == "running") {
          // setRunning(true); // running state not used
        }
        if (currentStatus == "submitted" || currentStatus == "executed") {
          setresults(probResults);
          // setRunning(false);
          updateLoading(false);
        }
      } catch (error) {
        console.error("Error processing real-time update:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId]);

  // null | "problem" | "editor" | "chat"

  return (
    <>
      {show_loading && (
        <div className="text-white animate-pulse">{loadingMessage}</div>
      )}

      {roundStatus == "initialising" && show_prob_screen && !show_loading && (
        <div>
          <ProblemPicker
            topics={availableTopics}
            difficulties={["Easy", "Medium", "Hard"]}
            onConfirm={handleConfirmSelection}
          ></ProblemPicker>
        </div>
      )}

      {(roundStatus == "executed" || roundStatus == "submitted") && (
        <div>
          <div className="fixed inset-0 z-[100] flex items-center justify-center  backdrop-blur-sm">
            <ProblemScore
              roundStatus={roundStatus}
              is_driver={driver_id === user_id}
              evaluation={results}
              onTryAgain={async () => {
                const resetUpdates = {
                  "gameState/roundStatus": "coding",
                  "gameState/judgeResults": null,
                };
                await f.updateRoomData(resetUpdates, roomId, "");
              }}
              onStartNext={async () => {
                await startNewProblem();
              }}
              onClose={async () => {
                const gameStateUpdates = {
                  "gameState/roundStatus": "coding",
                  "gameState/judgeResults": null,
                };
                await f.updateRoomData(gameStateUpdates, roomId, "");
              }}
            />
          </div>
        </div>
      )}

      {driver_uname && roundStatus == "initialising" && show_guest_screen && (
        <div className="text-white">{driver_uname} is choosing a problem !</div>
      )}

      {/* 🚀 THE FIX: Adding ?. to activeProblem prevents the React Crash */}
      {(roundStatus == "coding" || roundStatus == "running") && (
        <div>
          <div className="relative h-screen w-screen bg-[#05071a] text-white flex overflow-hidden">
            <div className="flex w-full h-full">
              {/* Problem Panel */}
              <div className="w-[30%] h-full ">
                <Problem
                  title={activeProblem?.title || "Loading..."} // Added ?. and a fallback
                  question={
                    activeProblem?.content || "Fetching problem details..."
                  } // Added ?.
                  onFocus={() => setFocused("problem")}
                />
              </div>

              {/* Editor/Whiteboard Panel */}
              <div className="w-[45%]">
                {showWhiteboard ? (
                  <Whiteboard
                    roomId={roomId}
                    username={users?.[user_id]}
                    center={focused === "whiteboard"}
                    onFocus={() => setFocused("whiteboard")}
                    onClose={() => setShowWhiteboard(false)}
                  />
                ) : (
                  <Editor
                    endTime={endTime}
                    roundStatus={roundStatus}
                    problem={activeProblem}
                    setRunning={handleRunCode}
                    roomId={roomId}
                    is_driver={show_prob_screen}
                    driver_uname={driver_uname}
                    codeSnippets={activeProblem?.codeSnippets || []}
                    center={focused === "editor"}
                    onFocus={() => setFocused("editor")}
                    onClose={() => setFocused(null)}
                    setShowWhiteboard={() => setShowWhiteboard(true)}
                  />
                )}

                <div className=" p-4">
                  {driver_id === user_id && (
                    <button
                      onClick={() => startNewProblem()}
                      className="w-full py-3 rounded-xl font-bold text-lg 
                       bg-cyan-500 cursor-pointer text-white
                       hover:from-cyan-400 hover:to-blue-500 
                       transition-all transform 
                       active:scale-95 shadow-lg shadow-cyan-500/20 
                       flex items-center justify-center gap-2"
                    >
                      Start Next Problem
                    </button>
                  )}
                  <p className="text-center text-[10px] text-slate-500 mt-2 uppercase tracking-widest">
                    Only the Driver can initiate the next round
                  </p>
                </div>
              </div>

              {/* Chat Panel */}
              <div className="w-[25%]">
                <Chat
                  roomId={roomId}
                  participants={users}
                  center={focused === "chat"}
                  onFocus={() => setFocused("chat")}
                  onClose={() => setFocused(null)}
                />
              </div>
            </div>

            {/* Center Stage Popups */}
            {roundStatus == "coding" && focused && (
              <CenterStage onClose={() => setFocused(null)}>
                {focused === "problem" && (
                  <Problem
                    title={activeProblem?.title}
                    question={activeProblem?.content}
                    center
                  />
                )}
              </CenterStage>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Room;

function CenterStage({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-[80%] h-[85%] animate-scaleIn">
        {children}
      </div>
    </div>
  );
}
