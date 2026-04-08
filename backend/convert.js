import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('./raw_problems.json', 'utf8'));

const langMapping = {
    "cpp": "C++", "java": "Java", "python": "Python", "python3": "Python3",
    "c": "C", "csharp": "C#", "javascript": "JavaScript", "typescript": "TypeScript",
    "php": "PHP", "swift": "Swift", "kotlin": "Kotlin", "dart": "Dart",
    "golang": "Go", "ruby": "Ruby", "scala": "Scala", "rust": "Rust"
};

function extractTestCases(examples) {
    if (!examples || examples.length === 0) return [];
    
    return examples.map(ex => {
        const match = ex.example_text.match(/Input:\s*(.*?)\nOutput:\s*(.*?)(?:\n|$)/is);
        if (!match) return null;

        const rawInput = match[1].trim();
        let expected = match[2].trim();

        // 🚀 THE FIX: Only clean the string if it has the "var = " explanation format
        // This prevents arrays like [0, -3, 9] from being chopped in half!
        if (expected.includes('=') && !expected.startsWith('[')) {
            expected = expected.split(',')[0].trim();
        }

        const args = rawInput.split(/,\s*(?=[a-zA-Z0-9_]+\s*=)/);
        const stdin = args.map(arg => arg.replace(/^[a-zA-Z0-9_]+\s*=\s*/, '')).join('\n');

        return { stdin, expected };
    }).filter(tc => tc !== null); 
}

const convertedProblems = rawData.questions.map(q => {
    const formattedSnippets = Object.entries(q.code_snippets).map(([key, code]) => ({
        lang: langMapping[key] || key,
        code: code
    }));

    const formattedTopics = q.topics.map(topic => ({ name: topic }));
    const testCases = extractTestCases(q.examples);

    // Build description HTML
    let cleanDesc = q.description.split("Example 1:")[0].trim().replace(/\n/g, '<br/>');
    let htmlContent = `<div class="text-left w-full"><p class="text-white/90 text-[15px] leading-relaxed">${cleanDesc}</p>`;

    // Build Examples UI
    if (q.examples && q.examples.length > 0) {
        q.examples.forEach(ex => {
            const inputMatch = ex.example_text.match(/Input:\s*(.*?)(?=\nOutput:|$)/is);
            const outputMatch = ex.example_text.match(/Output:\s*(.*?)(?=\nExplanation:|$)/is);
            const expMatch = ex.example_text.match(/Explanation:\s*(.*?)$/is);

            const inputTxt = inputMatch ? inputMatch[1].trim() : null;
            const outputTxt = outputMatch ? outputMatch[1].trim() : null;
            const expTxt = expMatch ? expMatch[1].trim() : null;

            htmlContent += `
            <div class="mt-8 text-left">
                <p class="font-bold text-white mb-3 text-base">Example ${ex.example_num}:</p>
                <div class="bg-[#1e293b]/60 border-l-[3px] border-cyan-500 p-4 rounded-r-xl text-[13px] font-mono shadow-sm">
            `;

            if (inputTxt && outputTxt) {
                htmlContent += `
                    <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 mb-2">
                        <span class="text-white/50 font-semibold select-none w-16 shrink-0">Input:</span>
                        <span class="text-cyan-300 break-all">${inputTxt}</span>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                        <span class="text-white/50 font-semibold select-none w-16 shrink-0">Output:</span>
                        <span class="text-emerald-400 font-bold">${outputTxt}</span>
                    </div>
                `;
                if (expTxt) {
                    htmlContent += `
                    <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 mt-3 pt-3 border-t border-slate-700/50">
                        <span class="text-white/50 font-semibold select-none shrink-0">Explanation:</span>
                        <span class="text-slate-300 whitespace-pre-wrap font-sans text-sm">${expTxt}</span>
                    </div>
                    `;
                }
            } else {
                htmlContent += `<pre class="whitespace-pre-wrap text-slate-300 font-mono text-[13px]"><code>${ex.example_text}</code></pre>`;
            }
            htmlContent += `</div></div>`;
        });
    }

    // Build Constraints UI
    if (q.constraints && q.constraints.length > 0) {
        htmlContent += `
        <div class="mt-8 mb-4 text-left">
            <p class="font-bold text-white mb-3 text-base">Constraints:</p>
            <ul class="list-disc pl-5 space-y-1.5 text-slate-400 marker:text-cyan-500/50">
                ${q.constraints.map(c => `
                    <li class="pl-1">
                        <code class="bg-[#1e293b] text-cyan-300 px-1.5 py-0.5 rounded text-[12px] font-mono border border-slate-700/50">${c}</code>
                    </li>
                `).join('')}
            </ul>
        </div>`;
    }

    htmlContent += `</div>`;

    return {
        questionFrontendId: q.frontend_id,
        title: q.title,
        titleSlug: q.problem_slug,
        difficulty: q.difficulty,
        content: htmlContent,            
        topicTags: formattedTopics,      
        codeSnippets: formattedSnippets, 
        testCases: testCases,            
        metaData: "{}"                   
    };
});

const validProblems = convertedProblems.filter(p => p.testCases.length > 0);
const finalOutput = { problems: validProblems };
fs.writeFileSync('./problem_set.json', JSON.stringify(finalOutput, null, 2));

console.log(`✅ Successfully cleaned Expected values and generated UI for ${validProblems.length} problems!`);