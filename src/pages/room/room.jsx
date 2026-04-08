import React, { useState, useEffect } from "react";
import Problem from "./problem";
import Editor from "./editor";
import ProblemPicker from "./prob_picker";
import ProblemScore from "./prob_score";
import Chat from "./chat";
import { useNavigate, useParams } from "react-router-dom";
import { useFirebase } from "../../services/firebase";
import Whiteboard from "./whiteboard";
import { apiGet, apiPost } from "../../services/api"; 

function Room(props) {
  const navigate = useNavigate();
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const [focused, setFocused] = useState(null);
  const availableTopics = [
    "Array", "Hash Table", "Linked List", "Math", "Recursion", "String",
    "Sliding Window", "Binary Search", "Divide and Conquer", "Two Pointers",
    "Dynamic Programming", "Greedy", "Trie", "Sorting", "Backtracking",
    "Stack", "Heap (Priority Queue)", "Merge Sort", "String Matching",
    "Bit Manipulation", "Matrix", "Monotonic Stack", "Simulation",
    "Combinatorics", "Memoization", "Depth-First Search", "Tree",
    "Binary Tree", "Binary Search Tree", "Breadth-First Search", "Union Find",
    "Graph", "Design", "Doubly-Linked List", "Geometry", "Interactive",
    "Bucket Sort", "Radix Sort", "Counting", "Data Stream", "Iterator",
    "Database", "Rolling Hash", "Hash Function", "Shell", "Enumeration",
    "Number Theory", "Topological Sort", "Prefix Sum", "Quickselect",
    "Binary Indexed Tree", "Segment Tree", "Line Sweep", "Ordered Set",
    "Queue", "Monotonic Queue", "Counting Sort", "Brainteaser",
    "Game Theory", "Eulerian Circuit", "Bitmask", "Randomized",
    "Reservoir Sampling", "Shortest Path", "Rejection Sampling",
    "Probability and Statistics", "Suffix Array", "Concurrency",
    "Minimum Spanning Tree", "Biconnected Component", "Sort",
    "Strongly Connected Component",
  ];
  
  const [roundStatus, setRoundStatus] = useState("initialising");
  const [activeProblem, setProblem] = useState(null);
  let user_id = localStorage.getItem("id") || props.user_id;
  const [users, setUsers] = useState(null);

  const [driver_id, setDriver] = useState(null);
  const [driver_uname, setDriverName] = useState(null);
  const [host_id, setHostId] = useState(null);

  const show_prob_screen = driver_id !== null && driver_id === user_id;
  const show_guest_screen = driver_id !== null && driver_id !== user_id;
  
  const [show_loading, updateLoading] = useState(true);
  const loadingMessage =
    show_guest_screen || show_prob_screen
      ? "Setting up the coding environment..."
      : "Loading the session for you...";
      
  const { roomId } = useParams();
  const f = useFirebase();
  const [results, setresults] = useState({});
  const [endTime, setTimer] = useState(Date.now());

  // --- ACTIONS ---

  const handleConfirmSelection = async (selectedDifficulty, selectedTopic) => {
    updateLoading(true);
    try {
      const response = await apiGet(
          `fetchProblem?roomId=${encodeURIComponent(roomId)}&difficulty=${encodeURIComponent(selectedDifficulty)}&topic=${encodeURIComponent(selectedTopic)}`,
      );
      
      if (!response || response.error) throw new Error(response.error);

      // 🚀 TIMER FIX: Check if we are continuing a session or starting fresh
      const currentRoomState = await f.getRoomData(roomId); 
      const sessionConfig = currentRoomState?.gameState?.config;
      const existingTimer = currentRoomState?.gameState?.timerEndTime;

      const safeProblem = JSON.parse(JSON.stringify(response.problem));
      
      const updates = { 
        "gameState/currentProblem": safeProblem,
        "gameState/roundStatus": "coding",
        "gameState/editorCode": safeProblem?.codeSnippets?.find(s => s.lang === "JavaScript")?.code || ""
      };

      if (!existingTimer) {
        const durationMinutes = sessionConfig?.totalDuration || 45; 
        updates["gameState/timerEndTime"] = Date.now() + (durationMinutes * 60 * 1000);
      }

      await f.updateRoomData(updates, roomId, "");
      setProblem(safeProblem);
      updateLoading(false);  

    } catch (error) {
      console.error("Selection failed:", error);
      updateLoading(false);
    }
  };

  async function startNewProblem() {
    if (driver_id !== user_id) return;
    try {
      updateLoading(true);
      await apiGet(`nextRound?roomId=${roomId}`);
    } catch (error) {
      console.error("Failed to start next round:", error);
      updateLoading(false);
    }
  }

  const handleRunCode = async (code, selectedLang, is_run = true) => {
    if (!activeProblem || !activeProblem.title) {
      console.warn("Cannot run code: Problem details are missing.");
      return; 
    }
    
    await f.updateRoomData({ "gameState/roundStatus": "running" }, roomId, "");

    const payload = {
      roomId: roomId,
      language: selectedLang,
      code: code,
      is_run: is_run,
      problem: activeProblem,
    };

    try {
      const data = await apiPost("runCode", payload);
      if (data.success) {
        console.log("Execution successful:", data.results);
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (error) {
      console.error("Failed to run code:", error);
      await f.updateRoomData({ "gameState/roundStatus": "coding" }, roomId, "");
      alert("AI/Compiler Error: " + error.message);
    }
  };

  // --- LIFECYCLE & SYNC ---

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = f.subscribeToRoom(roomId, (roomData) => {
      if (!roomData || !roomData.gameState) return;

      try {
        const user_id = localStorage.getItem("id") || props.user_id;
        
        if (roomData.host_id) setHostId(roomData.host_id);

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

        if (gameStatus === "ended") {
          navigate(gameUrl);
        }

        if (!participantsObj) return;

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

        if (currentProblem) {
          setProblem(currentProblem);
        }

        if (currentStatus === "initialising") {
          updateLoading(false);
        } else if (currentStatus === "coding" || currentStatus === "running") {
          updateLoading(false); 
        } else if (currentStatus === "submitted" || currentStatus === "executed") {
          setresults(probResults);
          updateLoading(false);
        }
      } catch (error) {
        console.error("Error processing real-time update:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, navigate, props.user_id, f]);

  // 🚀 PRESENCE FIX: Tell Firebase Server to watch our connection
  useEffect(() => {
    if (roomId && user_id && users && users[user_id]) {
      f.setPresence(roomId, user_id, users[user_id]);
    }
  }, [roomId, user_id, users, f]); 


  // 🚀 SELF-HEALING FIX: Auto-Rescue Orphaned Rooms
  useEffect(() => {
    if (!users || !driver_id || !host_id) return;

    const activeUserIds = Object.keys(users);
    
    const driverIsMissing = !activeUserIds.includes(driver_id);
    const hostIsMissing = !activeUserIds.includes(host_id);

    if (driverIsMissing) {
      console.log(`🚨 Zombie Driver Detected: ${driver_uname} dropped!`);

      // 1. Host rescues. 2. If Host is dead, the first living person rescues.
      const amITheRescueHero = (user_id === host_id) || (hostIsMissing && activeUserIds[0] === user_id);

      if (amITheRescueHero) {
        console.log("🛠️ Hero is auto-skipping the round to rescue the game...");
        
        updateLoading(true);
        apiGet(`nextRound?roomId=${roomId}`)
          .catch(err => {
            console.error("Failed to auto-skip round:", err);
            updateLoading(false);
          });
      }
    }
  }, [users, driver_id, driver_uname, user_id, host_id, roomId]);


  // --- RENDER ---

  return (
    <>
      {show_loading && (
        <div className="flex h-screen w-screen items-center justify-center bg-[#05071a]">
            <div className="text-cyan-400 animate-pulse text-xl font-semibold">{loadingMessage}</div>
        </div>
      )}

      {roundStatus === "initialising" && show_prob_screen && !show_loading && (
        <div className="flex h-screen w-screen items-center justify-center bg-[#05071a]">
          <ProblemPicker
            topics={availableTopics}
            difficulties={["Easy", "Medium", "Hard"]}
            onConfirm={handleConfirmSelection}
          />
        </div>
      )}

      {(roundStatus === "executed" || roundStatus === "submitted") && (
        <div>
          <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm">
            <ProblemScore
              roundStatus={roundStatus}
              is_driver={driver_id === user_id}
              evaluation={results}
              onTryAgain={async () => {
                await f.updateRoomData({
                  "gameState/roundStatus": "coding",
                  "gameState/judgeResults": null,
                }, roomId, "");
              }}
              onStartNext={async () => {
                await startNewProblem();
              }}
              onClose={async () => {
                await f.updateRoomData({
                  "gameState/roundStatus": "coding",
                  "gameState/judgeResults": null,
                }, roomId, "");
              }}
            />
          </div>
        </div>
      )}

      {driver_uname && roundStatus === "initialising" && show_guest_screen && !show_loading && (
        <div className="flex h-screen w-screen items-center justify-center bg-[#05071a]">
            <div className="text-white text-xl">{driver_uname} is choosing a problem!</div>
        </div>
      )}

      {/* Safety Fallback if the database is missing the problem data */}
      {(roundStatus === "coding" || roundStatus === "running") && !activeProblem && !show_loading && (
        <div className="flex flex-col h-screen w-screen items-center justify-center bg-[#05071a]">
            <div className="text-white text-xl mb-4">Syncing problem data...</div>
            {driver_id === user_id && (
              <button 
                onClick={() => startNewProblem()} 
                className="px-6 py-2 bg-cyan-500 rounded-xl text-white font-bold hover:bg-cyan-400"
              >
                Cancel & Start New Problem
              </button>
            )}
        </div>
      )}

      {(roundStatus === "coding" || roundStatus === "running") && activeProblem && !show_loading && (
        <div>
          <div className="relative h-screen w-screen bg-[#05071a] text-white flex overflow-hidden">
            <div className="flex w-full h-full">
              {/* Problem Panel */}
              <div className="w-[30%] h-full ">
                <Problem
                  title={activeProblem?.title || "Loading..."} 
                  question={activeProblem?.content || "Fetching problem details..."} 
                  onFocus={() => setFocused("problem")}
                />
              </div>

              {/* Editor/Whiteboard Panel */}
              <div className="w-[45%] flex flex-col">
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

                <div className="p-4 shrink-0">
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
              <div className="w-[25%] h-full">
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
            {roundStatus === "coding" && focused && (
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