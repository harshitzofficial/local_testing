

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PenLine } from "lucide-react";

import MonacoEditor from "@monaco-editor/react";
import debounce from "lodash.debounce";
import Timer from "./timer";
import "./scrollbar.css";
import { useFirebase } from "../../services/firebase";
import { useMemo } from "react";

function Editor({
  endTime,
  roundStatus,
  problem,
  setRunning,
  roomId,
  is_driver,
  driver_uname,
  codeSnippets,
  onFocus,
  center,
  onClose,
 setShowWhiteboard
}) {
  const f = useFirebase();
  const editorRef = useRef(null);
  const isHydrated = useRef(false);

  const problemId = problem?.questionId;
  const [selectedLang, setSelectedLang] = useState("JavaScript");
  const [typingStatus, setTypingStatus] = useState({
    typing: false,
    driver: driver_uname
  });

  const monacoLanguageMap = {
    "JavaScript": "javascript",
    "TypeScript": "typescript",
    "Python3": "python",
    "Python": "python",
    "Java": "java",
    "C++": "cpp",
    "C#": "csharp",
    "C": "c",
    "Go": "go",
    "Kotlin": "kotlin",
    "Swift": "swift",
    "Rust": "rust",
    "Ruby": "ruby",
    "PHP": "php",
    "Dart": "dart",
    "Scala": "scala",
    "Elixir": "elixir",
    "Erlang": "erlang",
    "Racket": "racket"
  };

  const getFallbackJS = () => {
    try {
      const meta = JSON.parse(problem.metaData);
      const name = meta.name || "solution";
      const params = meta.params?.map(p => p.name).join(", ") || "";
      return `var ${name} = function(${params}) {\n\n};`;
    } catch {
      return "// Start coding here...";
    }
  };

  const [codeByProblem, setCodeByProblem] = useState({});

  useEffect(() => {
    if (!problemId) return;

    setCodeByProblem(prev => {
      if (prev[problemId]) return prev;

      const initial = {};
      if (codeSnippets?.length) {
        codeSnippets.forEach(s => {
          initial[s.lang] = s.code;
        });
      } else {
        initial["JavaScript"] = getFallbackJS();
      }

      return { ...prev, [problemId]: initial };
    });

    setSelectedLang(
      codeSnippets?.[0]?.lang || "JavaScript"
    );

    isHydrated.current = false;
  }, [problemId]);

  const currentCode =
    codeByProblem?.[problemId]?.[selectedLang] || "";

  useEffect(() => {
    if (!roomId || !problemId) return;

    const unsubscribe = f.subscribeToEditor(roomId, editorData => {
      if (!editorData) return;

      if (editorData.questionId !== problem.questionId) return;

      if (!is_driver) {
        if (editorData.language) {
          setSelectedLang(prev =>
            prev !== editorData.language ? editorData.language : prev
          );
        }

        setTypingStatus(editorData.status);

        setCodeByProblem(prev => {
        
          if (!editorData.language) return;

          const targetLang = editorData.language;

          return {
            ...prev,
            [problemId]: {
              ...(prev[problemId] || {}),
              [targetLang]: editorData.code
            }
          };
        });

        isHydrated.current = true;
      }
    });

    return unsubscribe;
  }, [roomId, problemId, is_driver]);

  const sendTypingSignal = async isTyping => {
    await f.writeCode(roomId, {
      typing: isTyping,
      driver: driver_uname
    }, "status/");
  };

  const debouncedWrite = useCallback(
    debounce((code, lang) => {
      f.writeCode(roomId, {
        questionId: problem.questionId,
        lastChangeBy: driver_uname,
        updatedAt: Date.now(),
        language: lang, 
        code: code
      });
    }, 300),
    [roomId, driver_uname, problem.questionId] 
  );

  const handleEditorChange = newValue => {
    if (!is_driver) return;
    setCodeByProblem(prev => ({
      ...prev,
      [problemId]: {
        ...(prev[problemId] || {}),
        [selectedLang]: newValue
      }
    }));

    sendTypingSignal(true);
    debouncedWrite(newValue, selectedLang);
  };

  const timeUp = () => {
    setRunning(editorRef.current?.getValue(), selectedLang, false)
  }


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
          className={`bg-[#11172a] p-4 rounded-xl flex flex-col border border-cyan-400/30 ${center ? "w-[80%] h-[85%]" : "h-full"
            }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-cyan-400 font-semibold">{is_driver ? 'You' : driver_uname}</span>
            <span className="text-xs text-white/60">Driver</span>
            {center && (
              <button onClick={onClose} className="cursor-pointer text-white/60">✕</button>
            )}
          </div>


          <div className="flex text-sm justify-between py-4  custom-scrollbar items-center mb-4">
            {/* <button onClick={(e) => e.stopPropagation()}
              className="text-xs text-gray-400 me-4 justify-start hover:text-white font-bold border border-none tracking-wider">
              Hints
            </button> */}
            <button onClick={(e) => {e.stopPropagation(); setShowWhiteboard(true)}}
  className="flex items-center cursor-pointer gap-1 text-xs text-gray-400 hover:text-white font-bold border-none tracking-wider">
              <PenLine size={15} />
              Whiteboard
            </button>
            



            <div className="flex-1 flex justify-center min-w-[200px]">
              <Timer onComplete={timeUp} targetDate={endTime} />
            </div>

            {is_driver && <select

              onClick={(e) => e.stopPropagation()}
              value={selectedLang}
              onChange={async (e) => {
                // if (!is_driver) return;
                const lang = e.target.value;
                setSelectedLang(lang);

                await f.writeCode(roomId, {
                  questionId: problem.questionId,
                  lastChangeBy: driver_uname,
                  language: lang,
                  updatedAt: Date.now(),
                  code: codeByProblem?.[problem.questionId]?.[lang] || ""
                });
              }}
              className="bg-gray-800 cursor-pointer justify-end text-xs text-white rounded px-2 py-1"
            >
              {codeSnippets?.map(s => (
                <option key={s.lang} value={s.lang}>{s.lang}</option>
              ))}
            </select>
            }

            {
              !is_driver && <label className="font-semibold text-cyan-400">
                {selectedLang}
              </label>
            }
          </div>




          <div className="flex-1 bg-[#0b1020] rounded-lg p-3 text-sm font-mono text-left text-white/80
             overflow-auto custom-scrollbar flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >

            {roundStatus === "coding" && (
              <MonacoEditor
                onMount={editor => (editorRef.current = editor)}
                height="100%"
                language={monacoLanguageMap[selectedLang]}
                value={currentCode}
                onChange={handleEditorChange}
                options={{
                  readOnly: !is_driver,
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  padding: { top: 10 },
                }}
              />
            )}
            {roundStatus === "running" && (
              <span className="text-white/60">Code is Running...</span>
            )}
          </div>

          <div className="mt-3 flex justify-between">

            <button disabled={!is_driver} onClick={(e) => {
              e.stopPropagation();
              setRunning(editorRef.current?.getValue(), selectedLang)
            }}

              className="cursor-pointer flex items-center gap-2 text-cyan-400 disabled:text-gray-500 disabled:cursor-not-allowed group transition-colors"
            >
              <span className="group-disabled:text-gray-500 transition-colors">▶</span>
              <span className="text-sm font-semibold">Run Code</span>
            </button>


            <button disabled={!is_driver}
              className={`
  px-4 py-1.5 rounded-lg text-sm text-white font-semibold transition-colors
  ${is_driver
                  ? "bg-cyan-500  cursor-pointer"
                  : "bg-gray-300 cursor-not-allowed"}
`}
              onClick={(e) => {
                e.stopPropagation();
                const currentCode = editorRef.current ? editorRef.current.getValue() : allCode[selectedLang];
                setRunning(editorRef.current?.getValue(), selectedLang, false)
              }}
            >
              Submit Code
            </button>
          </div>

          {/* {!is_driver && (
            <div className="text-xs text-gray-400">
              {typingStatus.typing
                ? `${typingStatus.driver} is typing...`
                : "Idle"}
            </div>
          )} */}

          {!is_driver && <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${typingStatus?.typing ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">
              {typingStatus?.typing
                ? `${typingStatus.driver} is typing...`
                : 'Idle'}
            </span>
          </div>
          }


        </div>
      </div >
    </>
  );
}

export default Editor;

