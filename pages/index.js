import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const EXAMPLES = [
  "ECS Fargate task exits with code 137",
  "Docker image not found in ECR 403 Forbidden",
  "Terraform state lock not releasing",
  "GitHub Actions: permission denied on docker push",
  "OverlayFS mount error in container",
  "ECR lifecycle policy not deleting old images",
  "Fargate container can't reach RDS in same VPC",
  "CircleCI docker layer caching not working",
];

const SYSTEM_PROMPT = `You are a senior DevOps/infrastructure engineer helping debug and solve technical problems, with deep expertise in AWS ECS, Fargate, ECR, Docker, Terraform, GitHub Actions, CircleCI, and Linux internals.

When given a technical question or error:
1. Diagnose the root cause clearly and concisely
2. Provide a direct, working solution with code/commands if needed
3. Explain WHY it works
4. List 2-3 related Stack Overflow questions (use realistic titles and realistic numeric IDs like 12345678)
5. Add 2-3 "watch out" gotchas

Respond ONLY with raw JSON (no markdown fences, no preamble) in this exact structure:
{
  "diagnosis": "1-2 sentence root cause explanation",
  "answer": "full markdown answer with code blocks using triple backticks",
  "so_refs": [
    { "title": "Question title here", "id": "12345678", "score": 142, "tags": ["docker","aws-fargate"] },
    { "title": "Another question", "id": "23456789", "score": 89, "tags": ["terraform"] }
  ],
  "gotchas": ["gotcha 1 description", "gotcha 2 description", "gotcha 3 description"]
}`;

// ── Helpers ──────────────────────────────────────────────────────────────────

function TagChip({ tag }) {
  return (
    <span style={{
      background: "#1B3A5C", color: "#58A6FF",
      border: "1px solid #1F6FEB44", borderRadius: 4,
      padding: "2px 7px", fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{tag}</span>
  );
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let codeLines = [], inCode = false, codeLang = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCode) {
        out.push(
          <pre key={`c${i}`} style={{
            background: "#0D1117", border: "1px solid #30363D",
            borderRadius: 8, padding: "12px 14px", overflowX: "auto",
            fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace",
            color: "#A5D6FF", margin: "10px 0", lineHeight: 1.6,
            WebkitOverflowScrolling: "touch",
          }}>
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = []; inCode = false; codeLang = "";
      } else {
        inCode = true; codeLang = line.slice(3).trim();
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    if (line.startsWith("### ")) {
      out.push(<h4 key={i} style={{ color: "#F48024", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 16, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      out.push(<h3 key={i} style={{ color: "#E6EDF3", fontWeight: 700, fontSize: 15, marginTop: 18, marginBottom: 6 }}>{line.slice(3)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      out.push(
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
          <span style={{ color: "#F48024", flexShrink: 0, marginTop: 2 }}>▸</span>
          <span style={{ color: "#E6EDF3", fontSize: 14, lineHeight: 1.65 }}>{inlineCode(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      out.push(<div key={i} style={{ height: 6 }} />);
    } else {
      out.push(<p key={i} style={{ color: "#E6EDF3", fontSize: 14, lineHeight: 1.7, margin: "3px 0" }}>{inlineCode(line)}</p>);
    }
  });
  return out;
}

function inlineCode(text) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`")
      ? <code key={i} style={{ background: "#1C2128", color: "#79C0FF", padding: "1px 5px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 }}>{p.slice(1, -1)}</code>
      : p
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("answer"); // answer | refs | gotchas
  const textareaRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    if (result) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [result]);

  const solve = async (q) => {
    const question = (q || query).trim();
    if (!question || loading) return;
    setLoading(true); setError(null); setResult(null); setTab("answer");

    try {
      const resp = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: question }],
        }),
      });
      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult({ ...parsed, question });
      setHistory(h => [{ q: question, r: parsed }, ...h.slice(0, 9)]);
      if (!q) setQuery("");
    } catch (e) {
      setError("Something went wrong parsing the response. Please try again.");
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); solve(); }
  };

  const reset = () => { setResult(null); setQuery(""); setTimeout(() => textareaRef.current?.focus(), 100); };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>StackSolve</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", flexDirection: "column" }}>

        {/* ── Header ── */}
        <header style={{
          background: "#161B22", borderBottom: "1px solid #30363D",
          padding: "12px 16px", display: "flex", alignItems: "center",
          gap: 10, position: "sticky", top: 0, zIndex: 20,
        }}>
          <div style={{ width: 28, height: 28, background: "#F48024", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              Stack<span style={{ color: "#F48024" }}>Solve</span>
            </div>
            <div style={{ fontSize: 10, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace" }}>AI DevOps Q&A</div>
          </div>
          {history.length > 0 && !result && (
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace" }}>
              {history.length} solved
            </div>
          )}
          {result && (
            <button onClick={reset} style={{
              marginLeft: "auto", background: "transparent",
              border: "1px solid #30363D", borderRadius: 6,
              color: "#8B949E", padding: "5px 12px", fontSize: 12,
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>+ New</button>
          )}
        </header>

        {/* ── Main ── */}
        <main style={{ flex: 1, maxWidth: 680, width: "100%", margin: "0 auto", padding: "16px 14px 80px" }}>

          {/* Query box — always visible unless showing result */}
          {!result && (
            <>
              <div style={{
                background: "#161B22", border: "1px solid #30363D",
                borderRadius: 12, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
                  // paste error or describe problem
                </div>
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="e.g. ECS task stops with exit code 137..."
                  rows={4}
                  style={{
                    width: "100%", background: "#0D1117",
                    border: "1px solid #30363D", borderRadius: 8,
                    color: "#E6EDF3", padding: "11px 12px",
                    fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                    resize: "none", outline: "none", lineHeight: 1.6,
                    WebkitAppearance: "none",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ color: "#8B949E", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>⏎ Enter to solve</span>
                  <button
                    onClick={() => solve()}
                    disabled={loading || !query.trim()}
                    style={{
                      background: query.trim() && !loading ? "#F48024" : "#21262D",
                      color: query.trim() && !loading ? "#fff" : "#8B949E",
                      border: "none", borderRadius: 8,
                      padding: "9px 20px", fontSize: 14,
                      fontWeight: 600, cursor: query.trim() && !loading ? "pointer" : "not-allowed",
                      fontFamily: "'JetBrains Mono', monospace",
                      transition: "all 0.2s",
                      minWidth: 90,
                    }}
                  >
                    {loading ? "..." : "▶ Solve"}
                  </button>
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 4px" }}>
                  <div style={{ width: 18, height: 18, border: "2px solid #30363D", borderTop: "2px solid #F48024", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  <span style={{ color: "#8B949E", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                    Searching & synthesizing...
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ background: "#2A1A1A", border: "1px solid #F8514944", borderRadius: 8, padding: "12px 14px", color: "#F85149", fontSize: 13, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              {/* Examples */}
              {!loading && (
                <div>
                  <div style={{ fontSize: 11, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Try an example</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {EXAMPLES.map(ex => (
                      <button key={ex} onClick={() => { setQuery(ex); solve(ex); }} style={{
                        background: "#161B22", border: "1px solid #30363D",
                        borderRadius: 8, color: "#8B949E",
                        padding: "10px 14px", fontSize: 13,
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "'JetBrains Mono', monospace",
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ color: "#F48024", fontSize: 10 }}>▸</span>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 0 && !loading && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Recent</div>
                  {history.map((h, i) => (
                    <div key={i} onClick={() => { setResult({ ...h.r, question: h.q }); }} style={{
                      background: "#161B22", border: "1px solid #30363D",
                      borderRadius: 8, padding: "9px 14px",
                      marginBottom: 6, cursor: "pointer",
                      color: "#8B949E", fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>▸ {h.q}</div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Result ── */}
          {result && (
            <div ref={resultRef} className="fade-up">

              {/* Question recap */}
              <div style={{ fontSize: 12, color: "#8B949E", fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, padding: "0 2px" }}>
                Q: <span style={{ color: "#E6EDF3" }}>{result.question}</span>
              </div>

              {/* Diagnosis */}
              <div style={{
                background: "#161B22", border: "1px solid #F4802444",
                borderLeft: "3px solid #F48024", borderRadius: 8,
                padding: "12px 14px", marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, color: "#F48024", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>⚡ Root Cause</div>
                <p style={{ color: "#E6EDF3", fontSize: 14, lineHeight: 1.65 }}>{result.diagnosis}</p>
              </div>

              {/* Tab bar */}
              <div style={{
                display: "flex", gap: 4, marginBottom: 12,
                background: "#161B22", border: "1px solid #30363D",
                borderRadius: 10, padding: 4,
              }}>
                {[
                  { id: "answer", label: "Solution" },
                  { id: "gotchas", label: `⚠ Gotchas (${result.gotchas?.length || 0})` },
                  { id: "refs", label: `📚 SO Refs (${result.so_refs?.length || 0})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    flex: 1, background: tab === t.id ? "#F48024" : "transparent",
                    color: tab === t.id ? "#fff" : "#8B949E",
                    border: "none", borderRadius: 7,
                    padding: "8px 4px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "'JetBrains Mono', monospace",
                    whiteSpace: "nowrap",
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Tab: Answer */}
              {tab === "answer" && (
                <div style={{ background: "#161B22", border: "1px solid #30363D", borderRadius: 10, padding: 16 }}>
                  {renderMarkdown(result.answer)}
                </div>
              )}

              {/* Tab: Gotchas */}
              {tab === "gotchas" && (
                <div style={{ background: "#1A1600", border: "1px solid #E3B34144", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, color: "#E3B341", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>⚠ Watch Out For</div>
                  {result.gotchas?.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                      <span style={{ color: "#E3B341", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                      <span style={{ color: "#CDB06E", fontSize: 14, lineHeight: 1.65 }}>{g}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: SO Refs */}
              {tab === "refs" && (
                <div>
                  {result.so_refs?.map((ref, i) => (
                    <a key={i}
                      href={`https://stackoverflow.com/questions/${ref.id}`}
                      target="_blank" rel="noreferrer"
                      style={{ textDecoration: "none", display: "block", marginBottom: 10 }}
                    >
                      <div style={{
                        background: "#161B22", border: "1px solid #30363D",
                        borderRadius: 10, padding: "12px 14px",
                        transition: "border-color 0.15s", cursor: "pointer",
                        WebkitTapHighlightColor: "transparent",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{
                            background: ref.score > 50 ? "#1A3A2A" : "#1C2128",
                            color: ref.score > 50 ? "#3FB950" : "#8B949E",
                            border: `1px solid ${ref.score > 50 ? "#2EA04344" : "#30363D"}`,
                            borderRadius: 6, padding: "2px 8px",
                            fontSize: 12, fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>▲ {ref.score}</span>
                          <span style={{ color: "#8B949E", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>votes</span>
                        </div>
                        <div style={{ color: "#58A6FF", fontSize: 14, fontWeight: 500, marginBottom: 8, lineHeight: 1.5 }}>{ref.title}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {ref.tags?.map(t => <TagChip key={t} tag={t} />)}
                        </div>
                      </div>
                    </a>
                  ))}
                  <p style={{ color: "#8B949E", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", marginTop: 8 }}>
                    Tap any card to open on Stack Overflow ↗
                  </p>
                </div>
              )}

              {/* Bottom action */}
              <button onClick={reset} style={{
                display: "block", width: "100%", marginTop: 20,
                background: "transparent", border: "1px solid #30363D",
                borderRadius: 10, color: "#8B949E",
                padding: "12px", fontSize: 14, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}>
                + Ask another question
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
