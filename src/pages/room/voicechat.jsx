import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { getDatabase, ref, set, onValue, onChildAdded, remove, off } from "firebase/database";
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2, VolumeX } from "lucide-react";

const DB = () => getDatabase();


async function sendSignal(roomId, fromId, toId, signal) {
    await set(
        ref(DB(), `root/liveContent/${roomId}/voice/signals/${toId}/${fromId}`),
        JSON.stringify(signal)
    );
}

async function sendPresence(roomId, userId, username) {
    await set(
        ref(DB(), `root/liveContent/${roomId}/voice/presence/${userId}`),
        { username, joinedAt: Date.now() }
    );
}

async function removePresence(roomId, userId) {
    await remove(ref(DB(), `root/liveContent/${roomId}/voice/presence/${userId}`));
    await remove(ref(DB(), `root/liveContent/${roomId}/voice/signals/${userId}`));
}

function getPresenceOnce(roomId, callback) {
    const presenceRef = ref(DB(), `root/liveContent/${roomId}/voice/presence`);
    const unsub = onValue(presenceRef, (snap) => {
        callback(snap.val() || {});
    }, { onlyOnce: true });
    return unsub;
}

function subscribeToNewPresence(roomId, callback) {
    const presenceRef = ref(DB(), `root/liveContent/${roomId}/voice/presence`);
    return onChildAdded(presenceRef, (snap) => {
        callback({ userId: snap.key, ...snap.val() });
    });
}

function subscribeToSignals(roomId, userId, callback) {
    const sigRef = ref(DB(), `root/liveContent/${roomId}/voice/signals/${userId}`);
    return onChildAdded(sigRef, (snap) => {
        try {
            callback({ fromId: snap.key, signal: JSON.parse(snap.val()) });
        } catch (_) {}
        remove(snap.ref); 
    });
}

export default function VoiceChat({ roomId, userId, username }) {
    const [active, setActive] = useState(false);
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [peers, setPeers] = useState({}); 
    const [error, setError] = useState(null);

    const streamRef = useRef(null);
    const peersRef = useRef({});
    const audioRefs = useRef({});
    const unsubsRef = useRef([]); 

    const createPeer = (peerId, peerUsername, stream, initiator, incomingSignal = null) => {
        if (peersRef.current[peerId]) return; 


        const peer = new SimplePeer({
            initiator,
            stream,
            trickle: true,
            config: {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" },
                ],
            },
        });

        peersRef.current[peerId] = peer;

        setPeers((prev) => ({
            ...prev,
            [peerId]: { username: peerUsername || peerId, speaking: false },
        }));

        peer.on("signal", (signal) => {
            sendSignal(roomId, userId, peerId, signal);
        });

        peer.on("stream", (remoteStream) => {
            const audio = new Audio();
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            audio.muted = deafened;
            audioRefs.current[peerId] = audio;
            setupSpeakingDetector(peerId, remoteStream);
        });

        peer.on("close", () => cleanupPeer(peerId));
        peer.on("error", (err) => {
            console.warn("Peer error:", peerId, err.message);
            cleanupPeer(peerId);
        });

        if (incomingSignal) {
            peer.signal(incomingSignal);
        }
    };

    const join = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            setActive(true);

            await sendPresence(roomId, userId, username);

            getPresenceOnce(roomId, (allPresence) => {
                Object.entries(allPresence).forEach(([peerId, data]) => {
                    if (peerId === userId) return;
                    createPeer(peerId, data.username, stream, true); 
                });
            });

          
            const unsubSignals = subscribeToSignals(roomId, userId, ({ fromId, signal }) => {
                if (peersRef.current[fromId]) {
                    peersRef.current[fromId].signal(signal);
                } else {
                    const presenceRef = ref(DB(), `root/liveContent/${roomId}/voice/presence/${fromId}`);
                    onValue(presenceRef, (snap) => {
                        const data = snap.val();
                        createPeer(fromId, data?.username || fromId, stream, false, signal);
                    }, { onlyOnce: true });
                }
            });

            unsubsRef.current.push(unsubSignals);

        } catch (err) {
            console.error("Voice join error:", err);
            setError(
                err.name === "NotAllowedError"
                    ? "Mic access denied — please allow microphone."
                    : "Could not start voice chat."
            );
            setActive(false);
        }
    };

    const setupSpeakingDetector = (peerId, stream) => {
        try {
            const ctx = new AudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                if (!peersRef.current[peerId]) return;
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setPeers((prev) => ({
                    ...prev,
                    [peerId]: { ...prev[peerId], speaking: avg > 12 },
                }));
                requestAnimationFrame(tick);
            };
            tick();
        } catch (_) {}
    };

    const cleanupPeer = (peerId) => {
        peersRef.current[peerId]?.destroy();
        delete peersRef.current[peerId];
        audioRefs.current[peerId]?.pause();
        delete audioRefs.current[peerId];
        setPeers((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
        });
    };

    const leave = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        unsubsRef.current.forEach((fn) => fn?.());
        unsubsRef.current = [];
        Object.keys(peersRef.current).forEach(cleanupPeer);
        await removePresence(roomId, userId);
        setActive(false);
        setMuted(false);
        setDeafened(false);
        setPeers({});
    };

    const toggleMute = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (track) track.enabled = muted;
        setMuted((m) => !m);
    };

    const toggleDeafen = () => {
        Object.values(audioRefs.current).forEach((a) => { a.muted = !deafened; });
        setDeafened((d) => !d);
    };

    useEffect(() => () => { if (active) leave(); }, []);

    return (
        <div className="flex flex-col gap-2 px-3 py-2 bg-[#11172a] border border-white/10 rounded-xs">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase tracking-widest">Voice</span>

                <div className="flex items-center gap-1">
                    {active && (
                        <>
                            <button
                                onClick={toggleMute}
                                className="p-1.5 rounded-md cursor-pointer transition-all"
                                style={{
                                    background: muted ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                    color: muted ? "#ef4444" : "#9ca3af",
                                }}
                                title={muted ? "Unmute" : "Mute"}
                            >
                                {muted ? <MicOff size={12} /> : <Mic size={12} />}
                            </button>

                            <button
                                onClick={toggleDeafen}
                                className="p-1.5 rounded-md cursor-pointer transition-all"
                                style={{
                                    background: deafened ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                    color: deafened ? "#ef4444" : "#9ca3af",
                                }}
                                title={deafened ? "Undeafen" : "Deafen"}
                            >
                                {deafened ? <VolumeX size={12} /> : <Volume2 size={12} />}
                            </button>

                            <button
                                onClick={leave}
                                className="p-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/30 cursor-pointer transition-all"
                                title="Leave"
                            >
                                <PhoneOff size={12} />
                            </button>
                        </>
                    )}

                    {!active && (
                        <button
                            onClick={join}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 text-[10px] font-bold transition-all cursor-pointer border border-cyan-500/20"
                        >
                            <PhoneCall size={10} />
                            Join
                        </button>
                    )}
                </div>
            </div>

            {error && <p className="text-[10px] text-red-400">{error}</p>}

            {active && (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${muted ? "bg-red-400" : "bg-cyan-400"}`}
                            style={{ boxShadow: muted ? "none" : "0 0 5px #22d3ee" }} />
                        <span className="text-[11px] text-cyan-400 font-bold">
                            {username} (you)
                        </span>
                        {muted && <span className="text-[9px] text-red-400">muted</span>}
                    </div>

                    {Object.entries(peers).map(([peerId, { username: peerName, speaking }]) => (
                        <div key={peerId} className="flex items-center gap-2">
                            <div
                                className="w-2 h-2 rounded-full transition-all duration-100"
                                style={{
                                    background: speaking ? "#22d3ee" : "#374151",
                                    boxShadow: speaking ? "0 0 6px #22d3ee" : "none",
                                }}
                            />
                            <span className={`text-[11px] transition-colors ${speaking ? "text-white" : "text-white/50"}`}>
                                {peerName}
                            </span>
                        </div>
                    ))}

                    {Object.keys(peers).length === 0 && (
                        <p className="text-[10px] text-white/20 italic">Waiting for others to join...</p>
                    )}
                </div>
            )}
        </div>
    );
}