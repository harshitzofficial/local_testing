import React from "react";
import './scrollbar.css';

function Problem({ title, question, onFocus, center }) {
  // 🚀 Safe fallback if the question description is missing
  const safeQuestion = question ? question : `
    <div style="text-align:center; padding:12px; color:#d1d5db; font-size:14px;">
      <p><strong>Question content unavailable</strong></p>
      <p>
        This problem does not include the question description.
        Please proceed to the next problem.
      </p>
    </div>
  `;
  
  return (
    <div
      onClick={!center ? onFocus : undefined}
      className={`
        cursor-pointer
        transition-all
        ${center ? "h-full" : "h-full p-4"}
      `}
    >
      {/* Kept your awesome cyan border and shadow styling! */}
      <div className="flex flex-col rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.25)] bg-[#0f172a] p-5 space-y-5 h-full">
        
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {/* 🚀 Added 'problem-description', 'space-y-4', and 'leading-relaxed' to make the HTML look beautiful */}
        <div 
          dangerouslySetInnerHTML={{ __html: safeQuestion }}
          className="flex-1 overflow-y-auto overflow-x-auto text-sm text-white/80 text-left pr-2 custom-scrollbar problem-description space-y-4 leading-relaxed"
        />
        
      </div>
    </div>
  );
}

export default Problem;