const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const dropPlaceholder = document.getElementById("drop-placeholder");
const scanBtn = document.getElementById("scan-btn");
const lotsCopyBtn = document.getElementById("lots-copy-btn");
const newScanBtn = document.getElementById("new-scan-btn");
const lotsRetryBtn = document.getElementById("lots-retry-btn");
const copyHistoryBtn = document.getElementById("copy-history-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const addMoreBtn = document.getElementById("add-more-btn");
const clearAllBtn = document.getElementById("clear-all-btn");
const previewGrid = document.getElementById("preview-grid");
const linkToPatientBtn = document.getElementById("link-to-patient-btn");
const cancelLotPatientBtn = document.getElementById("cancel-lot-patient-btn");
const lotPickerPatients = document.getElementById("lot-picker-patients");
const lotPickerNoPatients = document.getElementById("lot-picker-no-patients");

const uploadSection = document.getElementById("upload-section");
const lotsLoading = document.getElementById("lots-loading");
const resultsSection = document.getElementById("results-section");
const lotsErrorSection = document.getElementById("lots-error-section");
const lotPatientPicker = document.getElementById("lot-patient-picker");
const historySection = document.getElementById("history-section");
const resultsOutput = document.getElementById("results-output");
const historyOutput = document.getElementById("history-output");
const lotsErrorMsg = document.getElementById("lots-error-msg");

let imageDataList = [];
let lastScanResultIds = [];

function renderPreviews() {
  if (imageDataList.length === 0) {
    previewGrid.classList.add("hidden");
    previewGrid.innerHTML = "";
    dropPlaceholder.classList.remove("hidden");
    dropZone.style.display = "";
    addMoreBtn.classList.add("hidden");
    clearAllBtn.classList.add("hidden");
    scanBtn.disabled = true;
    return;
  }

  dropZone.style.display = "none";
  previewGrid.classList.remove("hidden");
  addMoreBtn.classList.remove("hidden");
  clearAllBtn.classList.remove("hidden");
  scanBtn.disabled = false;

  previewGrid.innerHTML = imageDataList.map((src, i) => `
    <div class="preview-thumb">
      <img src="${src}" alt="Preview ${i + 1}">
      <button class="preview-remove" data-index="${i}" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `).join("");

  previewGrid.querySelectorAll(".preview-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      imageDataList.splice(parseInt(btn.dataset.index), 1);
      renderPreviews();
    });
  });
}

function addFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      imageDataList.push(e.target.result);
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
}

// Upload interactions
dropZone.addEventListener("click", () => fileInput.click());
addMoreBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) addFiles(e.target.files);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
});

clearAllBtn.addEventListener("click", () => {
  imageDataList = [];
  renderPreviews();
});

scanBtn.addEventListener("click", scanImages);

lotsCopyBtn.addEventListener("click", async () => {
  copyToClipboard(resultsOutput, lotsCopyBtn);
});

copyHistoryBtn.addEventListener("click", async () => {
  copyToClipboard(historyOutput, copyHistoryBtn);
});

async function copyToClipboard(element, button) {
  try {
    await navigator.clipboard.writeText(element.innerText);
    button.classList.add("copy-success");
    setTimeout(() => button.classList.remove("copy-success"), 1500);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    button.classList.add("copy-success");
    setTimeout(() => button.classList.remove("copy-success"), 1500);
  }
}

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear all scan history?")) {
    saveScanHistory([]);
    renderHistory();
  }
});

newScanBtn.addEventListener("click", () => {
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  imageDataList = [];
  renderPreviews();
});

lotsRetryBtn.addEventListener("click", () => {
  lotsErrorSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
});

async function scanImages() {
  if (imageDataList.length === 0) return;

  uploadSection.classList.add("hidden");
  lotsErrorSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  lotsLoading.classList.remove("hidden");

  try {
    const res = await fetch("/api/scan-lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: imageDataList }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Scan failed");

    resultsOutput.innerHTML = formatResults(data.results);
    lotsLoading.classList.add("hidden");
    resultsSection.classList.remove("hidden");

    if (data.results && data.results.length > 0) {
      lastScanResultIds = addToHistory(data.results);
    }
  } catch (err) {
    lotsLoading.classList.add("hidden");
    lotsErrorMsg.textContent = err.message;
    lotsErrorSection.classList.remove("hidden");
  }
}

function addToHistory(results) {
  const history = getScanHistory();
  const timestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const ids = [];
  results.forEach((item) => {
    const id = generateId();
    ids.push(id);
    history.unshift({ ...item, id, scannedAt: timestamp });
  });
  saveScanHistory(history);
  renderHistory();
  return ids;
}

function renderHistory() {
  const history = getScanHistory();
  if (history.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historySection.classList.remove("hidden");
  historyOutput.innerHTML = history
    .map(
      (item, i) => `
    <div class="result-card history-card">
      <div class="history-card-header">
        <div class="result-product">${escapeHtml(item.product || "Unknown Product")}</div>
        <button class="btn-delete" data-index="${i}" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="result-fields">
        <div class="result-field">
          <span class="field-label">Lot Number</span>
          <span class="field-value">${escapeHtml(item.lot || "Not found")}</span>
        </div>
        <div class="result-field">
          <span class="field-label">Expiry Date</span>
          <span class="field-value">${escapeHtml(item.expiry || "Not found")}</span>
        </div>
      </div>
      <div class="history-timestamp">${item.scannedAt}</div>
    </div>
  `
    )
    .join("");

  historyOutput.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const history = getScanHistory();
      history.splice(index, 1);
      saveScanHistory(history);
      renderHistory();
    });
  });
}

renderHistory();

// --- Link to Patient picker ---
linkToPatientBtn.addEventListener("click", () => {
  const patients = getPatients();
  if (patients.length === 0) {
    lotPickerPatients.innerHTML = "";
    lotPickerNoPatients.classList.remove("hidden");
  } else {
    lotPickerNoPatients.classList.add("hidden");
    lotPickerPatients.innerHTML = patients.map(p => `
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

    lotPickerPatients.querySelectorAll(".patient-row").forEach(row => {
      row.addEventListener("click", () => {
        const patientId = row.dataset.id;
        const links = getLotLinks();
        lastScanResultIds.forEach(lotId => {
          if (!links.some(l => l.lotId === lotId && l.patientId === patientId)) {
            links.push({ lotId, patientId });
          }
        });
        saveLotLinks(links);
        lotPatientPicker.classList.add("hidden");
        resultsSection.classList.remove("hidden");
        linkToPatientBtn.textContent = "Linked!";
        setTimeout(() => { linkToPatientBtn.textContent = "Link to Patient"; }, 1500);
      });
    });
  }

  resultsSection.classList.add("hidden");
  lotPatientPicker.classList.remove("hidden");
});

cancelLotPatientBtn.addEventListener("click", () => {
  lotPatientPicker.classList.add("hidden");
  resultsSection.classList.remove("hidden");
});

function formatResults(results) {
  if (!results || results.length === 0) {
    return '<p class="no-results">No lot numbers or expiry dates found in the image.</p>';
  }

  return results
    .map(
      (item) => `
    <div class="result-card">
      <div class="result-product">${escapeHtml(item.product || "Unknown Product")}</div>
      <div class="result-fields">
        <div class="result-field">
          <span class="field-label">Lot Number</span>
          <span class="field-value">${escapeHtml(item.lot || "Not found")}</span>
        </div>
        <div class="result-field">
          <span class="field-label">Expiry Date</span>
          <span class="field-value">${escapeHtml(item.expiry || "Not found")}</span>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}
