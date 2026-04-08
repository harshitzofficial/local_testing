import React from "react";
import { useState } from "react";

function ProblemPicker({ topics, difficulties, onConfirm }) {
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDiff, setSelectedDiff] = useState("");

  return (
    <div
      className="flex flex-col text-white rounded-2xl border border-white/10 bg-[#161b2e] p-5 gap-4 w-[500px]"
      style={{ height: "520px" }}
    >
      <h2 className="text-2xl font-bold text-center text-white shrink-0">
        Your Turn to Choose{" "}
      </h2>
      <h3 className="text-sm text-center text-white/80 shrink-0">
        Select Topic
      </h3>
      <div className="flex items-center justify-center flex-wrap gap-2 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 cursor-pointer py-1.5 rounded-lg text-xs transition-all duration-200 border shrink-0 ${
              selectedTopic === topic
                ? "bg-cyan-500 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                : "bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300"
            }`}
          >
            {topic}
          </button>
        ))}
      </div>
      <div className="shrink-0">
        <h3 className="text-sm text-white/80 mb-2 text-center">
          Select Difficulty
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDiff(diff)}
              className={`py-2.5 rounded-xl font-bold text-sm transition-all border cursor-pointer ${
                selectedDiff === diff
                  ? "bg-cyan-500 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button" // 👈 1. Explicitly tell the browser this is NOT a submit button
        disabled={!selectedTopic || !selectedDiff}
        onClick={(e) => {
          e.preventDefault(); // 👈 2. Stop any default refresh behavior
          onConfirm(selectedDiff, selectedTopic);
        }}
        className="shrink-0 w-full cursor-pointer hover:bg-cyan-400 transition-all transform active:scale-95 shadow-lg bg-cyan-500 text-white font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm Selection
      </button>
    </div>
  );
}

export default ProblemPicker;
