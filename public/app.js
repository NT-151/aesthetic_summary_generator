const transcriptEl = document.getElementById("transcript");
const extractBtn = document.getElementById("extract-btn");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const newBtn = document.getElementById("new-btn");
const retryBtn = document.getElementById("retry-btn");

const inputSection = document.getElementById("input-section");
const loadingSection = document.getElementById("loading");
const outputSection = document.getElementById("output-section");
const errorSection = document.getElementById("error-section");
const notesOutput = document.getElementById("notes-output");
const errorMsg = document.getElementById("error-msg");

// Enable/disable buttons based on textarea content
transcriptEl.addEventListener("input", () => {
  const hasText = transcriptEl.value.trim().length > 0;
  extractBtn.disabled = !hasText;
  clearBtn.disabled = !hasText;
});

clearBtn.addEventListener("click", () => {
  transcriptEl.value = "";
  extractBtn.disabled = true;
  clearBtn.disabled = true;
  transcriptEl.focus();
});

extractBtn.addEventListener("click", extractNotes);

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(notesOutput.innerText);
    copyBtn.classList.add("copy-success");
    setTimeout(() => copyBtn.classList.remove("copy-success"), 1500);
  } catch {
    // Fallback for older browsers
    const range = document.createRange();
    range.selectNodeContents(notesOutput);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    copyBtn.classList.add("copy-success");
    setTimeout(() => copyBtn.classList.remove("copy-success"), 1500);
  }
});

newBtn.addEventListener("click", () => {
  outputSection.classList.add("hidden");
  inputSection.classList.remove("hidden");
  transcriptEl.value = "";
  extractBtn.disabled = true;
  clearBtn.disabled = true;
  transcriptEl.focus();
});

retryBtn.addEventListener("click", () => {
  errorSection.classList.add("hidden");
  inputSection.classList.remove("hidden");
});

async function extractNotes() {
  const transcript = transcriptEl.value.trim();
  if (!transcript) return;

  inputSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  outputSection.classList.add("hidden");
  loadingSection.classList.remove("hidden");

  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Extraction failed");
    }

    notesOutput.innerHTML = formatNotes(data.notes);
    loadingSection.classList.add("hidden");
    outputSection.classList.remove("hidden");
  } catch (err) {
    loadingSection.classList.add("hidden");
    errorMsg.textContent = err.message;
    errorSection.classList.remove("hidden");
  }
}

function formatNotes(text) {
  // Convert markdown bold to HTML and add light formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}
