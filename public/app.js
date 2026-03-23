// --- Sidebar navigation ---
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const contentSections = document.querySelectorAll(".content-section");

sidebarLinks.forEach(link => {
  link.addEventListener("click", () => {
    const target = link.dataset.section;

    sidebarLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    contentSections.forEach(s => s.classList.add("hidden"));
    document.getElementById(`section-${target}`).classList.remove("hidden");
  });
});

// --- Notes ---
const transcriptEl = document.getElementById("transcript");
const extractBtn = document.getElementById("extract-btn");
const clearBtn = document.getElementById("clear-btn");
const notesCopyBtn = document.getElementById("notes-copy-btn");
const newBtn = document.getElementById("new-btn");
const notesRetryBtn = document.getElementById("notes-retry-btn");
const saveToPatientBtn = document.getElementById("save-to-patient-btn");
const cancelPickerBtn = document.getElementById("cancel-picker-btn");
const pickerPatientList = document.getElementById("picker-patient-list");
const pickerNoPatients = document.getElementById("picker-no-patients");

const notesInputSection = document.getElementById("notes-input-section");
const notesLoading = document.getElementById("notes-loading");
const notesOutputSection = document.getElementById("notes-output-section");
const notesErrorSection = document.getElementById("notes-error-section");
const notesPatientPicker = document.getElementById("notes-patient-picker");
const notesOutput = document.getElementById("notes-output");
const notesErrorMsg = document.getElementById("notes-error-msg");
const notesHistorySection = document.getElementById("notes-history-section");
const notesHistoryOutput = document.getElementById("notes-history-output");
const copyNotesHistoryBtn = document.getElementById("copy-notes-history-btn");
const clearNotesHistoryBtn = document.getElementById("clear-notes-history-btn");

let lastExtractedNotes = "";

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

notesCopyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(notesOutput.innerText);
    notesCopyBtn.classList.add("copy-success");
    setTimeout(() => notesCopyBtn.classList.remove("copy-success"), 1500);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(notesOutput);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    notesCopyBtn.classList.add("copy-success");
    setTimeout(() => notesCopyBtn.classList.remove("copy-success"), 1500);
  }
});

newBtn.addEventListener("click", () => {
  notesOutputSection.classList.add("hidden");
  notesInputSection.classList.remove("hidden");
  transcriptEl.value = "";
  extractBtn.disabled = true;
  clearBtn.disabled = true;
  transcriptEl.focus();
});

notesRetryBtn.addEventListener("click", () => {
  notesErrorSection.classList.add("hidden");
  notesInputSection.classList.remove("hidden");
});

async function extractNotes() {
  const transcript = transcriptEl.value.trim();
  if (!transcript) return;

  notesInputSection.classList.add("hidden");
  notesErrorSection.classList.add("hidden");
  notesOutputSection.classList.add("hidden");
  notesLoading.classList.remove("hidden");

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

    lastExtractedNotes = data.notes;
    notesOutput.innerHTML = formatNotes(data.notes);
    notesLoading.classList.add("hidden");
    notesOutputSection.classList.remove("hidden");

    // Save to notes history
    addToNotesHistory(data.notes);
  } catch (err) {
    notesLoading.classList.add("hidden");
    notesErrorMsg.textContent = err.message;
    notesErrorSection.classList.remove("hidden");
  }
}

function formatNotes(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

// --- Save to Patient picker ---
saveToPatientBtn.addEventListener("click", () => {
  const patients = getPatients();
  if (patients.length === 0) {
    pickerPatientList.innerHTML = "";
    pickerNoPatients.classList.remove("hidden");
  } else {
    pickerNoPatients.classList.add("hidden");
    pickerPatientList.innerHTML = patients.map(p => `
      <div class="patient-row" data-id="${p.id}">
        <div class="patient-row-info">
          <div class="patient-row-name">${escapeHtml(p.name)}</div>
          <div class="patient-row-meta">${p.dob ? formatDob(p.dob) : ""}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    `).join("");

    pickerPatientList.querySelectorAll(".patient-row").forEach(row => {
      row.addEventListener("click", () => {
        const patientId = row.dataset.id;
        const notes = getPatientNotes();
        notes.unshift({
          id: generateId(),
          patientId,
          name: new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          content: lastExtractedNotes,
          createdAt: new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        });
        savePatientNotes(notes);
        notesPatientPicker.classList.add("hidden");
        notesOutputSection.classList.remove("hidden");
        saveToPatientBtn.textContent = "Saved!";
        setTimeout(() => { saveToPatientBtn.textContent = "Save to Patient"; }, 1500);
      });
    });
  }

  notesOutputSection.classList.add("hidden");
  notesPatientPicker.classList.remove("hidden");
});

cancelPickerBtn.addEventListener("click", () => {
  notesPatientPicker.classList.add("hidden");
  notesOutputSection.classList.remove("hidden");
});

// --- Notes History ---
function addToNotesHistory(content) {
  const history = getNotesHistory();
  const timestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Extract a short title from the first bold heading or first line
  const titleMatch = content.match(/\*\*(.+?)\*\*/);
  const title = titleMatch ? titleMatch[1] : "Extracted Notes";
  history.unshift({ id: generateId(), title, content, createdAt: timestamp });
  saveNotesHistory(history);
  renderNotesHistory();
}

function renderNotesHistory() {
  const history = getNotesHistory();
  if (history.length === 0) {
    notesHistorySection.classList.add("hidden");
    return;
  }

  notesHistorySection.classList.remove("hidden");
  notesHistoryOutput.innerHTML = history.map((item, i) => `
    <div class="result-card note-history-card" data-index="${i}">
      <div class="history-card-header">
        <div class="result-product">${escapeHtml(item.title)}</div>
        <button class="btn-delete" data-index="${i}" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="notes-content note-preview">${formatNotes(item.content)}</div>
      <div class="history-timestamp">${item.createdAt}</div>
    </div>
  `).join("");

  // Delete individual items
  notesHistoryOutput.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const history = getNotesHistory();
      history.splice(index, 1);
      saveNotesHistory(history);
      renderNotesHistory();
    });
  });

  // Click to expand/view
  notesHistoryOutput.querySelectorAll(".note-history-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete")) return;
      const index = parseInt(card.dataset.index);
      const history = getNotesHistory();
      lastExtractedNotes = history[index].content;
      notesOutput.innerHTML = formatNotes(history[index].content);
      notesInputSection.classList.add("hidden");
      notesOutputSection.classList.remove("hidden");
    });
  });
}

copyNotesHistoryBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(notesHistoryOutput.innerText);
    copyNotesHistoryBtn.classList.add("copy-success");
    setTimeout(() => copyNotesHistoryBtn.classList.remove("copy-success"), 1500);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(notesHistoryOutput);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    copyNotesHistoryBtn.classList.add("copy-success");
    setTimeout(() => copyNotesHistoryBtn.classList.remove("copy-success"), 1500);
  }
});

clearNotesHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear all notes history?")) {
    saveNotesHistory([]);
    renderNotesHistory();
  }
});

// Render on load
renderNotesHistory();
