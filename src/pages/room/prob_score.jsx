import React from 'react';
import { X, CheckCircle2, Zap, BarChart3, Terminal, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

function ProblemScore({ roundStatus, is_driver, evaluation, onClose, onStartNext, onTryAgain }) {
    if (!evaluation) return null;

    const isAccepted = evaluation.overallStatus === "Accepted";

    return (
        <div className="relative flex flex-col text-white rounded-2xl font-semibold border border-cyan-400/40 bg-[#05071a] w-full max-w-[650px] h-[80vh] shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">

            {roundStatus=="executed" && <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-1.5 rounded-lg bg-slate-800/40 hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all border border-slate-700/50"
            >
                <X size={18} />
            </button>
            }
            <div className="p-8 border-b border-slate-800/60 grid grid-cols-3 items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isAccepted ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {isAccepted ? <CheckCircle2 className="text-green-400" size={28} /> : <XCircle className="text-red-500" size={28} />}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-slate-500 text-[9px] uppercase tracking-[0.2em] font-bold mb-0.5">Status</p>
                        <p className={`text-sm font-black ${isAccepted ? 'text-green-400' : 'text-red-500'}`}>
                            {isAccepted ? "PASSED" : "FAILED"}
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-xl font-bold tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                        {roundStatus == "executed" ? "Execution Result" : "Submit Result"}
                    </h2>
                </div>

                <div className="flex justify-end">
                    {evaluation.score !== undefined && (
                        <div className="text-right pr-4">
                            <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold mb-0.5">Total Score</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-3xl font-black text-cyan-400 leading-none">{evaluation.score}</span>
                                <span className="text-[10px] text-slate-600 font-bold">/100</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 font-semibold overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {evaluation.complexity && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#161b22] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                            <Zap size={20} className="text-cyan-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Runtime</p>
                                <p className="text-base text-white">{evaluation.complexity.time}</p>
                            </div>
                        </div>
                        <div className="bg-[#161b22] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                            <BarChart3 size={20} className="text-blue-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Memory</p>
                                <p className="text-base text-white">{evaluation.complexity.space}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-cyan-500/5 border-l-4 border-cyan-500 p-5 rounded-r-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <Terminal size={16} className="text-cyan-400" />
                        <h4 className="text-cyan-400 text-xs uppercase tracking-widest">Judge's Analysis</h4>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic font-sans">"{evaluation.analysis}"</p>
                </div>

                {evaluation.testReport && (
                    <div className="space-y-4 pb-4">
                        <h3 className="text-xs text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">{roundStatus == "executed" ? "Test Case Breakdown" : "Test Case Summary"}</h3>
                        <div className="grid gap-3">
                            {evaluation.testReport.map((test, i) => (
                                <div key={i} className={`p-3 rounded-xl border-l-4 bg-[#161b22] ${test.passed ? 'border-green-500' : 'border-red-500'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-white">Case {test.case}</span>
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${test.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {test.passed ? "Success" : "Failure"}
                                        </span>
                                    </div>
                                    {roundStatus == "executed" && <div className="mt-3 space-y-3 text-xs">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-slate-500 shrink-0">Input</span>
                                            <span className="font-normal text-slate-200 truncate">{test.input}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Expected</span>
                                            <span className="text-green-400">{test.expected}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Actual</span>
                                            <span className={test.passed ? "justify-end text-green-400" : "justify-end text-red-400"}>{test.actual}</span>
                                        </div>
                                    </div>
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {is_driver && <div className="p-6 border-t border-slate-800/60 bg-[#0b1020] flex items-center gap-4 shrink-0">

                {roundStatus == "executed" && <button
                    onClick={onTryAgain || onClose}
                    className="flex-1 py-3 px-4 cursor-pointer rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                    <RotateCcw size={16} />
                    Try Again
                </button>
                }

                <button
                    onClick={onStartNext}
                    className="flex-[2] py-3 px-4 cursor-pointer rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-[#0b1020] transition-all transform active:scale-95 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                >

                    <>
                        <Zap size={18} className="fill-current " />
                        Go to Next Problem
                    </>

                </button>
            </div>}
        </div>
    );
}

export default ProblemScore;