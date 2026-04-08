import React, { useState, useEffect } from "react";
import './scrollbar.css'; 
import Avatar from "boring-avatars";
import { useFirebase } from "../../services/firebase";
import VoiceChat from "./voicechat";

function Chat({ roomId, onFocus, center, onClose, participants = ['G', 'H'] }) {
    const user_id = localStorage.getItem("id");
    const f = useFirebase();
    const [msgs, setMessages] = useState([]);
    const [text, setText] = useState('');

    useEffect(() => {
        if (!roomId) {
            return;
        }

        const unsubscribe = f.subscribeToChat(roomId, (msg) => {
            if (!msg) {
                return;
            }

            try {

                setMessages((prev) => [...prev, msg]);




            } catch (error) {
                console.error("Error processing real-time chat update:", error);
            }
        });

        return () => {
            unsubscribe(); 
        };

    }, [roomId]);


    // participants=["G", "H"]
    return (
        <>
            {center && (
                <div
                    className="fixed inset-0 z-[10] bg-[#11172a]/60 backdrop-blur-md transition-opacity duration-300"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                />
            )}

            <div
                onClick={!center ? onFocus : undefined}
                className={`
                    transition-all duration-300 ease-in-out
                    ${center
                        ? "fixed inset-0 z-[90] animate-scaleIn flex items-center justify-center p-4"
                        : "relative h-full w-full p-4"}
                `}
            >
                <div className={`
                    bg-[#0f172a] rounded-2xl border border-cyan-400/40 
                    shadow-[0_0_30px_rgba(34,211,238,0.25)] flex flex-col transition-all
                    ${center ? "w-[60%] h-[85%] ease-in-out animate-scaleIn" : "w-full h-full"}
                `}>

                    <div className="flex justify-between items-center p-5 border-b border-white/10">

                        <div className="flex row">
                            {Object.values(participants).map((name) => (
                                <div


                                    key={name}
                                    className="flex flex-col items-right gap-3   px-0.5 py-1 rounded-xl hover:border-cyan-400/30 transition-colors"
                                >
                                    <Avatar
                                        size={20}
                                        name={name}
                                        variant="beam"
                                    />

                                </div>
                            ))}
                        </div>
                        <h2 className="text-lg font-semibold text-cyan-400">
                            Live Chat
                        </h2>


                        {center && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="p-2 cursor-pointer hover:bg-white/10 rounded-full text-white/60 hover:text-white transition"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                        <VoiceChat
                            roomId={roomId}
                            userId={user_id}
                            username={participants[user_id]}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto py-2 space-y-3 custom-scrollbar">
                        {msgs.map((msg) => {
                            const is_me = msg.sender_id === user_id;

                            return (
                                <div
                                    key={msg.timestamp}
                                    className={`flex flex-shrink-0 items-start gap-2 px-4 py-1 rounded-xl transition-all
                    ${is_me ? "flex-row-reverse" : "flex-row"}
                `}
                                >
                                    <Avatar
                                        size={28}
                                        name={msg.sender} 
                                        variant="beam"
                                    />

                                    <div className={`flex flex-col max-w-[80%] ${is_me ? "items-end" : "items-start"}`}>
                                        <span className="text-[10px] text-white/40">{msg.sender}</span>
                                        <div className={`px-3 py-2 rounded-lg  gtext-xs mt-1 bg-cyan-800
                        ${is_me ? "rounded-tr-xs text-white" : "rounded-tl-xs text-white/80"}
                    `}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-5 bg-[#11172a]/50 border-t border-white/10">
                        <div className="relative">
                            <input
                                onChange={(e) => setText(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                value={text}
                                placeholder="Type a message to the group"
                                className="w-full bg-[#11172a] border border-white/10 px-4 py-3 rounded-xl text-sm outline-none focus:border-cyan-400/50 transition-all pr-12"
                            />
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setText(text);

                                    const data = {
                                        sender_id: user_id,
                                        sender: participants[user_id],
                                        text: text,
                                        timestamp: Date.now()
                                    }
                                    await f.sendMsg(roomId, data);

                                    setText('');
                                }}


                                className="text-sm cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-colors">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
}

export default Chat;