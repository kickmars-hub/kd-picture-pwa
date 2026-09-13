const TOTAL = 15;
const AI_ENDPOINT = "/api/check"; // Optional server-side AI checker.
const AI_FALLBACK_ENABLED = true;

let currentNumber = 1;
let answers = new Map();

const picture = document.getElementById("picture");
const input = document.getElementById("studentAnswer");
const result = document.getElementById("result");
const checkButton = document.getElementById("checkButton");
const numberButtons = document.getElementById("numberButtons");

function pad2(n) { return String(n).padStart(2, "0"); }

function normalize(text) {
  return text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[.!?;,]+$/g, "")
    .replace(/\s+/g, " ");
}

function tokenize(text) {
  return normalize(text).match(/[a-z0-9']+|[^\s]/g) || [];
}

function editDistance(a, b) {
  const x = tokenize(a), y = tokenize(b);
  const dp = Array.from({ length: x.length + 1 }, () => Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i++) dp[i][0] = i;
  for (let j = 0; j <= y.length; j++) dp[0][j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[x.length][y.length];
}

function closestAnswer(student, candidates) {
  return candidates
    .map(answer => ({ answer, distance: editDistance(student, answer) }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function wordDifference(student, expected) {
  const s = tokenize(student);
  const e = tokenize(expected);
  const missing = e.filter((w, i) => s[i] !== w);
  const extra = s.filter((w, i) => e[i] !== w);
  return { missing, extra };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function show(type, html) {
  result.className = `result ${type}`;
  result.innerHTML = html;
}

function setPicture(n) {
  currentNumber = n;
  picture.src = `PIC${pad2(n)}KD.png`;
  picture.alt = `Picture ${n}`;
  input.value = "";
  result.className = "result";
  result.innerHTML = "";
  document.querySelectorAll(".number-button").forEach(btn => {
    btn.classList.toggle("active", Number(btn.dataset.number) === n);
  });
  input.focus();
}

function buildButtons() {
  for (let i = 1; i <= TOTAL; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "number-button" + (i === 1 ? " active" : "");
    btn.textContent = i;
    btn.dataset.number = i;
    btn.addEventListener("click", () => setPicture(i));
    numberButtons.appendChild(btn);
  }
}

// CSV format supported:
// No,Answer1,Answer2
// 1,The boy is playing soccer.,A boy is playing soccer.
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

async function loadAnswers() {
  try {
    const response = await fetch("Answer.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = parseCSV(await response.text()).filter(r => r.some(v => v.trim() !== ""));
    const start = rows[0] && !/^\d+$/.test((rows[0][0] || "").trim()) ? 1 : 0;
    for (let i = start; i < rows.length; i++) {
      const key = (rows[i][0] || "").trim();
      let no = Number(key);
      if (!Number.isInteger(no)) {
        const m = key.match(/^PIC(\d{2})KD(?:\.png)?$/i);
        if (m) no = Number(m[1]);
      }
      const candidates = rows[i].slice(1).map(v => v.trim()).filter(Boolean);
      if (Number.isInteger(no) && no >= 1 && no <= TOTAL && candidates.length) answers.set(no, candidates);
    }
    if (!answers.size) throw new Error("No answers found");
  } catch (err) {
    console.error(err);
    show("info", "Answer.csv could not be loaded. Check that it is in the same folder as index.html and that the app is opened through HTTPS/web hosting, not directly as a file.");
  }
}

async function askAI(student, expectedAnswers) {
  if (!AI_FALLBACK_ENABLED) return null;
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pictureNumber: currentNumber, studentAnswer: student, expectedAnswers })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.correct !== "boolean") return null;
    return data;
  } catch (_) {
    return null;
  }
}

async function checkAnswer() {
  const student = input.value.trim();
  if (!student) {
    show("info", "Please write an English sentence first.");
    input.focus();
    return;
  }

  const candidates = answers.get(currentNumber) || [];
  if (!candidates.length) {
    show("info", `No answer is registered for No. ${currentNumber} in Answer.csv.`);
    return;
  }

  if (candidates.some(a => normalize(a) === normalize(student))) {
    show("correct", "<strong>Correct!</strong> ✓");
    return;
  }

  checkButton.disabled = true;
  show("info", "Checking...");

  const ai = await askAI(student, candidates);
  if (ai) {
    if (ai.correct) {
      show("correct", `<strong>Correct!</strong> ✓<div>${escapeHtml(ai.feedback || "Your sentence has the same meaning.")}</div>`);
    } else {
      const reference = ai.suggestedAnswer || candidates[0];
      show("incorrect", `<strong>Not quite.</strong><div>${escapeHtml(ai.feedback || "Please check your sentence.")}</div><div class="diff"><b>Example:</b> ${escapeHtml(reference)}</div>`);
    }
    checkButton.disabled = false;
    return;
  }

  // Offline/static fallback: exact-ish comparison and concrete difference hints.
  const closest = closestAnswer(student, candidates);
  const diff = wordDifference(student, closest.answer);
  const len = Math.max(tokenize(student).length, tokenize(closest.answer).length, 1);
  const similarity = 1 - closest.distance / len;

  if (similarity >= 0.88) {
    show("incorrect", `<strong>Almost!</strong><div>Your sentence is very close, but check the wording or grammar.</div><div class="diff"><b>Answer:</b> ${escapeHtml(closest.answer)}</div>`);
  } else {
    const missingText = diff.missing.length ? `<div>Check these expected words/parts: <span class="missing">${escapeHtml(diff.missing.slice(0,8).join(" "))}</span></div>` : "";
    const extraText = diff.extra.length ? `<div>Check these words/parts in your sentence: <span class="extra">${escapeHtml(diff.extra.slice(0,8).join(" "))}</span></div>` : "";
    show("incorrect", `<strong>Incorrect.</strong>${missingText}${extraText}<div class="diff"><b>Answer:</b> ${escapeHtml(closest.answer)}</div>`);
  }
  checkButton.disabled = false;
}

checkButton.addEventListener("click", checkAnswer);
input.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") checkAnswer();
});

buildButtons();
loadAnswers();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(console.error));
}
