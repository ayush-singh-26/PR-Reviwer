import { GoogleGenAI } from '@google/genai';

// init client (server-side with API key)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function reviewPrWithGemini({ owner, repo, prNumber, prTitle, prBody, patches }) {
  // Build a prompt: include PR title/body and code patches (trim large patches)
  const maxPatchChars = 4000;
  const patchText = patches.map(p => `--- ${p.filename}\n${(p.patch||'').slice(0, maxPatchChars)}`).join("\n\n");
  const prompt = `
You are an expert Senior Engineer doing a pull request review for repository ${owner}/${repo}.
PR #${prNumber}: ${prTitle}

PR description:
${prBody || '(no description provided)'}

Files/diffs:
${patchText}

Please produce:
1) A short summary of important changes.
2) Potential bugs, logic errors, or security issues.
3) Style / consistency suggestions.
4) Tests to add or edge cases to consider.
5) A short, actionable comment that can be posted as a PR comment (<= 600 chars).

Respond in clear sections.
  `;

  // call Gemini to generate review
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',  // pick a suitable model available to you
    contents: prompt,
    // you can set temperature, maxTokens etc depending on SDK version
  });
  // resp format differs slightly by SDK version — adapt as needed
  return resp.text || resp?.outputs?.map(o=>o?.content).join('\n') || String(resp);
}
