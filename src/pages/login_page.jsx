import React, { useState } from "react"
import { auth } from "../services/firebase";
import { useFirebase } from "../services/firebase";
import { useNavigate } from 'react-router-dom';
import { customAlphabet } from 'nanoid';



function LoginPage(props) {

    const user_id = localStorage.getItem('id') || props.user_id;
    // const user_id= auth?.currentUser?.uid;

    const navigate = useNavigate();
    const [step, updateStep] = useState(0);
    const [username, updateUserName] = useState(null);
    let [roomId, updateRoomId] = useState('');
    const [is_host, updateIsHost] = useState(false);




    const f = useFirebase();

    const addUserToRoom = async (id) => {

        const user_config = {
            [user_id]: {
                user_name: username,
                is_host: is_host,
                is_ready: false,
                score: 0,
                createdAt: Date.now(),
                is_driver: is_host,
            }
        }

        await f.writeUserData(user_config[user_id], `${id}/${user_id}`);
        await f.updateRoomData({ [user_id]: username }, id, 'gameState/participants_list/')



    }


    const handleGoogleSignIn = async () => {
        try {
            const resp = await f.handleGoogleSignIn();
            if (resp) {
                updateIsHost(true);
                updateStep(1);
            } else {
                console.error("Sign-in failed: no user returned");
            }
        } catch (error) {
            console.error("Authentication Error:", error.message);
        }
    };

    const sendHost = async () => {

        const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);


        const id = nanoid();
        updateRoomId(id);
        addUserToRoom(id);



        const roomData = {
            host_id: user_id,
            gameState: {
                gameStatus: "waiting",
                createdAt: Date.now(),
                roundStatus: null,
                participants_list: { [user_id]: true },
                gameUrl: `/${id}/lobby`,
                lastRound: null
            }

        };

        await f.writeRoomData(roomData, id);



        navigate(`/${id}/lobby`);



    }

    const checkValidId = async () => {


        const room = await f.getRoomData(roomId);
        if (room) {
            addUserToRoom(roomId);

            navigate(room.gameState.gameUrl);

        }


        else {
            alert('wrong sess id');
        }



    }

    const handleSessionSignIn = () => {


        checkValidId();






    }


    return (
        <>
            <div>

                {(step == 0) && <div className="gap-4 bg-[#161b2e] border border-white/10 p-12 rounded-[2.5rem] w-full max-w-[500px] shadow-2xl flex flex-col items-center" >

                    <h1 className="text-2xl md:text-3xl font-bold text-white text-center tracking-tight mt-3 leading-tight overflow-hidden">
                        <span className="text-marquee">
                            Solve. Collab. Level Up.
                        </span>
                    </h1>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full 
                        cursor-pointer
    sm:w-[320px]
    min-h-[56px]
    px-6 py-3
    bg-cyan-500 
    hover:bg-cyan-400
    hover:font-bold
    active:scale-95 
    transition-all duration-200
    text-white 
    font-semibold 
    rounded-xl 
    flex items-center 
    justify-center 
    gap-3 
    shadow-md
  "
                    > <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            className="w-5 h-5 sm:w-6 sm:h-6"
                            alt="Google"
                        />
                        <span className="text-base sm:text-lg">
                            Sign in with Google
                        </span>
                    </button>

                    <button onClick={() => {

                        updateStep(1);

                    }}


                        className="w-full rounded border border-blue h-full max-h-[70px] max-w-[280px] bg-white/40 text-gray font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all transform active:scale-95 shadow-lg cursor-pointer"                    >
                        Join Session by ID
                    </button>



                </div>}

                {(step == 1) && <div className="bg-[#161b2e] backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] w-full max-w-[420px] shadow-2xl flex flex-col items-center gap-8 ">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Enter Preferred UserName</h2>

                    <div className="relative w-full">
                        <input
                            type="text"
                            maxLength={10}
                            onChange={(e) => updateUserName(e.target.value)}
                            placeholder="SassySam"
                            className="w-full bg-white/5 rounded-2xl py-5 text-center text-3xl font-mono text-white tracking-wide outline-none focus:border-white/40 focus:bg-white/10 transition-all placeholder:opacity-20"
                        />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-blue-500/50 blur-sm"></div>
                    </div>

                    {/* <button className="w-full bg-white text-black py-4 rounded-2xl text-lg hover:bg-blue-50 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer">
                        ENTER LOBBY
                    </button> */}

                    <button
                        onClick={() => {


                            if (is_host)
                                sendHost();

                            else
                                updateStep(2);

                        }}

                        className="w-full 
                        cursor-pointer
    sm:w-[300px]
    min-h-[56px]
    px-6 py-3
    bg-cyan-500 
    hover:bg-cyan-400
    hover:font-bold 
    active:scale-95 
    transition-all duration-200
    text-white 
    
    rounded-xl 
    flex items-center 
    justify-center 
    gap-3 
    shadow-md
  ">                        {is_host ? 'ENTER LOBBY' : 'ENTER USERNAME'}
                    </button>
                </div>}

                {(step == 2) && <div className="bg-[#161b2e] backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] w-full max-w-[420px] shadow-2xl flex flex-col items-center gap-8 ">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Enter Room ID</h2>

                    <div className="relative w-full">
                        <input
                            type="text"
                            maxLength={6}
                            onChange={(e) => updateRoomId(e.target.value.toUpperCase())}
                            placeholder="A7B2X9"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-4xl text-white uppercase tracking-[0.2em] outline-none focus:bg-white/10 transition-all placeholder:opacity-20"
                        />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-blue-500/50 blur-sm"></div>
                    </div>

                    {/* <button className="w-full bg-white text-black py-4 rounded-2xl text-lg hover:bg-blue-50 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer">
                        ENTER LOBBY
                    </button> */}

                    <button
                        onClick={handleSessionSignIn}

className="w-full 
                        cursor-pointer
    sm:w-[300px]
    min-h-[56px]
    px-6 py-3
    bg-cyan-500 
    hover:bg-cyan-400
    hover:font-bold 
    active:scale-95 
    transition-all duration-200
    text-white 
    
    rounded-xl 
    flex items-center 
    justify-center 
    gap-3 
    shadow-md
  ">                                         ENTER LOBBY
                    </button>
                </div>}

            </div >




        </>
    )
}

export default LoginPage;