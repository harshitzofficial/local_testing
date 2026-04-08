import { useEffect, useRef, useState } from "react";
import { useFirebase } from "../../services/firebase";
import { Pencil, Eraser } from "lucide-react";

const USER_COLORS = [
    "#ff79c6", "#50fa7b", "#ffb86c", "#8be9fd",
    "#bd93f9", "#ff5555", "#f1fa8c", "#ff6e6e",
];
const TOOLS = { PEN: "pen", ERASER: "eraser" };

function getUserColor(username) {
    if (!username) return USER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export default function Whiteboard({ roomId, username, center, onFocus, onClose }) {
    const f = useFirebase();

    const canvasRef = useRef(null);
    const overlayRef = useRef(null);
    const isDrawing = useRef(false);
    const currentPath = useRef([]);

    const [tool, setTool] = useState(TOOLS.PEN);
    const [lineWidth, setLineWidth] = useState(3);
    const [authorColors, setAuthorColors] = useState({});
    const [drawing, setDrawing] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    const myColor = getUserColor(username);
    const themeColor = "#22d3ee"; 

    function drawStroke(ctx, stroke) {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === TOOLS.ERASER ? "#0b1020" : getUserColor(stroke.author);
        ctx.lineWidth = stroke.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
            const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
    }

    function getPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }

    function onPointerDown(e) {
        e.preventDefault();
        e.stopPropagation();
        isDrawing.current = true;
        setDrawing(true);
        setCursorPos({ x: e.clientX, y: e.clientY });
        currentPath.current = [getPos(e, overlayRef.current)];
    }

    function onPointerMove(e) {
        e.preventDefault();
        e.stopPropagation();
        setCursorPos({ x: e.clientX, y: e.clientY });
        if (!isDrawing.current) return;
        currentPath.current.push(getPos(e, overlayRef.current));
        const overlay = overlayRef.current;
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        drawStroke(ctx, { points: currentPath.current, lineWidth, tool, author: username });
    }

    async function onPointerUp(e) {
        e?.preventDefault();
        e?.stopPropagation();
        isDrawing.current = false;
        setDrawing(false);
        if (currentPath.current.length < 2) { currentPath.current = []; return; }
        const stroke = { points: currentPath.current, lineWidth, tool, author: username, ts: Date.now() };
        overlayRef.current.getContext("2d").clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        currentPath.current = [];
        await f.pushWhiteboardStroke(roomId, stroke);
    }

    useEffect(() => {
        if (!roomId) return;
        const unsubscribe = f.subscribeToWhiteboardStrokes(roomId, ({ key, stroke }) => {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) drawStroke(ctx, stroke);
            if (stroke.author) {
                setAuthorColors((prev) => ({ ...prev, [stroke.author]: getUserColor(stroke.author) }));
            }
        });
        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        const unsubscribe = f.subscribeToWhiteboardClear(roomId, () => {
            const ctx = canvasRef.current?.getContext("2d");
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setAuthorColors({});
        });
        return () => unsubscribe();
    }, [roomId]);

    const clearBoard = async () => {
        await f.clearWhiteboard(roomId);
    };

    return (
        <>
            {center && (
                <div
                    className="fixed inset-0 z-[10] bg-[#11172a]/40 backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <div
                onClick={!center ? onFocus : undefined}
                className={`transition-all custom-scroller ${center
                    ? "fixed inset-0 z-[90] flex items-center justify-center p-4"
                    : "relative h-[85%] w-full p-4"
                    }`}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`bg-[#11172a] rounded-xl flex flex-col border border-cyan-400/30 overflow-hidden ${center ? "w-[80%] h-[85%]" : "h-full"
                        }`}
                >
                    
                    <div className="flex items-center px-4 py-5 border-b border-white/10">
                        <div className="w-6" />
                        <span className="text-white font-bold text-center tracking-wide flex-1 text-lg">WHITEBOARD</span>

                        <div className="flex items-center gap-3 mr-2">
                            {Object.entries(authorColors).map(([author, color]) => (
                                <div key={author} className="flex items-center gap-1">
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 4px ${color}` }} />
                                    <span style={{ color: author === username ? color : "#aaa", fontSize: 9 }}>
                                        {author === username ? "YOU" : author}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {center && (
                            <button onClick={onClose} className="cursor-pointer text-white/40 hover:text-white text-lg leading-none">✕</button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 flex-wrap">
                        <div className="flex items-center gap-1.5 mr-1">
                            <svg width="20" height="8" viewBox="0 0 20 8">
                                <path d="M0 4 Q10 0 20 4" stroke={myColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            </svg>
                        </div>

                        <div className="w-px h-4 bg-white/10" />

                        {[TOOLS.PEN, TOOLS.ERASER].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTool(t)}
                                className="text-xs px-3 py-1 rounded-md border transition-all cursor-pointer"
                                style={{
                                    borderColor: tool === t ? themeColor : "rgba(255,255,255,0.15)",
                                    background: tool === t ? `${themeColor}22` : "transparent",
                                    color: tool === t ? themeColor : "#aaa",
                                }}
                            >
                                <span className="flex items-center gap-1">
                                    {t === TOOLS.PEN ? <Pencil size={11} /> : <Eraser size={11} />}
                                    {t === TOOLS.PEN ? "Pen" : "Eraser"}
                                </span>
                            </button>
                        ))}

                        <div className="flex items-center gap-2">
                            {/* <span className="text-xs">Size</span> */}
                            <input
                                type="range" min={1} max={20} value={lineWidth}
                                onChange={(e) => setLineWidth(Number(e.target.value))}
                                style={{ width: 70, accentColor: themeColor }}
                            />
                            <span className="text-xs w-4" style={{ color: themeColor }}>{lineWidth}</span>
                        </div>

                        <button
                            onClick={clearBoard}
                            className="ml-auto text-xs px-3 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer transition-all"
                        >
                            Clear
                        </button>

                        <button
                            onClick={onClose}
                            className="text-xs px-3 py-1 rounded-md border border-white/10 text-white/50 hover:text-white cursor-pointer transition-all"
                        >
                            Editor
                        </button>
                    </div>

                    <div className="relative flex-1 overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            width={1600} height={900}
                            className="absolute inset-0 w-full h-full"
                            style={{ background: "#0b1020" }}
                        />
                        <canvas
                            ref={overlayRef}
                            width={1600} height={900}
                            onMouseDown={onPointerDown}
                            onMouseMove={onPointerMove}
                            onMouseUp={onPointerUp}
                            onMouseLeave={onPointerUp}
                            onTouchStart={onPointerDown}
                            onTouchMove={onPointerMove}
                            onTouchEnd={onPointerUp}
                            className="absolute inset-0 w-full h-full"
                            style={{
                                cursor: tool === TOOLS.ERASER
                                    ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Crect x='2' y='2' width='16' height='16' rx='2' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E\") 10 10, cell"
                                    : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' fill='none' stroke='white' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") 0 24, crosshair"
                            }}
                        />

                        {drawing && tool === TOOLS.PEN && (
                            <div
                                className="fixed pointer-events-none z-[999] flex items-center gap-1"
                                style={{ left: cursorPos.x + 14, top: cursorPos.y + 14 }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: myColor, boxShadow: `0 0 4px ${myColor}` }} />
                                <span style={{
                                    color: myColor,
                                    fontSize: 10,
                                    fontWeight: 700,

                                    border: "none",
                                }}>
                                    {username}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}