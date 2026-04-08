import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from 'react-router-dom';
import { useFirebase } from "../services/firebase";
import Avatar from 'boring-avatars';
import { apiGet } from '../services/api';
import { auth } from '../services/firebase'; 

function Lobby(props) {

    const navigate = useNavigate();
    const user_id = localStorage.getItem('id') || props.user_id;

    const { roomId } = useParams();
    const f = useFirebase();
    let list = [];

    const [participants, setParticipants] = useState([]);
    const [host_id, setHostId] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!roomId) return;

        const unsubscribe = f.subscribeToRoom(roomId, (roomData) => {
            const gameUrl = roomData?.gameState?.gameUrl;
            const gameStatus = roomData?.gameState?.gameStatus;

            if (gameStatus != "waiting" && gameUrl) {
                navigate(gameUrl);
            }

            if (roomData?.gameState?.participants_list) {
                list = Object.values(roomData?.gameState?.participants_list)
                if (list) {
                    setParticipants(list);
                }
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        const fetchHost = async () => {
            try {
                const host = await f.getRoomData(roomId, 'host_id');
                setHostId(host);
            } catch (error) {
                console.error("Failed to fetch host:", error);
            }
        };
        fetchHost();
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const token = await user.getIdToken();
                console.log("🔥 FIREBASE TOKEN:", token);
            }
        });
        return () => unsubscribe();
    }, []);

    const [time, setTime] = useState(15);
    const [count, setCount] = useState(1);

    async function startNewGame(id) {
        try {
            const data = await apiGet(`createGame?roomId=${roomId}`);
            if (!data || !data.success) {
                throw new Error(data?.message || 'Server refused to create game');
            }
        } catch (error) {
            console.error("Failed to create game:", error);
            throw error;
        }
    }

    const createGame = async () => {
        setLoading(true);
        try {
            await startNewGame(roomId);

            // 🚀 THE LOGIC FIX: Save config values so room.jsx can prevent the timer reset
            const gameStateUpdates = {
                "gameState/config": {
                    totalDuration: parseInt(time),
                    problemCount: count * participants.length,
                },
                "gameState/gameStatus": "started",
                "gameState/currentRound": 0,
                "gameState/roundStatus": "initialising",
                "gameState/gameUrl": `/${roomId}/room`,
                "gameState/timerEndTime": null // Start fresh
            };
            
            await f.updateRoomData(gameStateUpdates, roomId, '');

        } catch (err) {
            console.error("Failed to create room:", err);
            alert("Could not start the game. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (<>
        {user_id === host_id && <div className="flex flex-row h-[400px] animate-in fade-in zoom-in duration-500 gap-4 max-w-[600px] font-inter">

            <div className="flex-[2] bg-[#161b2e] backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)]  p-8 rounded-[2.5rem] w-[400px] text-white flex flex-col items-center">

                <h1 className="text-xl font-semibold mb-5">
                    Configure Your Session
                </h1>
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent " />

                <div className="space-y-4 p-4 w-full">
                    <div className="flex justify-between text-sm uppercase text-white">
                        <span>Duration</span>
                        <span >{time} MINUTES</span>
                    </div>
                    <input
                        type="range"
                        min="10" max="60"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full h-1.5 accent-cyan-400 border-none rounded-full cursor-pointer"
                    />
                </div>

                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent " />

                <div className="mx-4 flex flex-row p-1">

                    <div className="my-4 flex-1 flex flex-col items-center">
                        <h3 className="text-white text-sm ">Problems</h3>

                        <div className="mt-2 flex items-center gap-2">
                            <button disabled={count <= 1} onClick={() => setCount((count - 1))} className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-gray-400 focus:bg-white/10 placeholder:opacity-20 hover:bg-white/10 transition active:scale-95">
                                −
                            </button>

                            <span className="text-3xl font-semibold min-w-[32px] text-center">
                                {count * participants.length}
                            </span>

                            <button onClick={() => setCount((count + 1))} className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition active:scale-95">
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent " />
                <div className="max-h-full font-medium ms-13 text-xs w-[420px] flex items-center gap-4  p-5 rounded-xl">

                    <div className="flex w-[140px] h-[40px] items-center bg-[#11172a] text-sm rounded-lg overflow-hidden">
                        <div className="w-full bg-[#20263d] border border-white/10 rounded-xl py-4   text-center text-lg text-white/10 uppercase tracking-[0.2em] outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:opacity-20"
                        >
                            {roomId}
                        </div>


                    </div>
                    <button
                        onClick={createGame}
                        disabled={loading}
                        className="
                        cursor-pointer
    w-[180px]
    bg-cyan-500 
    hover:bg-cyan-400
    hover:font-bold 
    active:scale-95 
    transition-all duration-200
    text-white 
    text-sm
    h-[40px]
    rounded-lg
    flex items-center 
    justify-center 

    shadow-md
  ">                                    
                        {loading ? "Starting..." : "Create & Enter Room"}
                    </button>

                </div>

            </div>
            <div className="w-[400px] flex flex-col bg-[#161b2e] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-gray-100 gap-2">
                <img src="/people.svg" alt="People" />
                
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="flex flex-col  text-white text-lg">
                    {participants.map((user) => (
                        <div
                            key={user}
                            className="flex text-center gap-3 w-full border-white/10 pb-2 "
                        >
                            <Avatar
                                size={25}
                                name={user}
                                variant="beam"
                            />

                            <span className="tracking-wide">
                                {user}
                            </span>
                            
                        </div>
                        
                    ))}
                                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                </div>
            </div>
        </div>

        }

        {user_id !== host_id && <div className="text-white">
            <h1>
                Waiting for host to start the session....</h1></div>}

    </>);
}

export default Lobby;