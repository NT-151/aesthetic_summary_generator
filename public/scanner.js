const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("drop-zone");
const dropPlaceholder = document.getElementById("drop-placeholder");
const previewImg = document.getElementById("preview-img");
const removeBtn = document.getElementById("remove-btn");
const scanBtn = document.getElementById("scan-btn");
const copyBtn = document.getElementById("copy-btn");
const newScanBtn = document.getElementById("new-scan-btn");
const retryBtn = document.getElementById("retry-btn");
const copyHistoryBtn = document.getElementById("copy-history-btn");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const uploadSection = document.getElementById("upload-section");
const loadingSection = document.getElementById("loading");
const resultsSection = document.getElementById("results-section");
const errorSection = document.getElementById("error-section");
const historySection = document.getElementById("history-section");
const resultsOutput = document.getElementById("results-output");
const historyOutput = document.getElementById("history-output");
const errorMsg = document.getElementById("error-msg");

let currentImageData = null;

// Load history from localStorage
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("scanHistory") || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem("scanHistory", JSON.stringify(history));
}

function addToHistory(results) {
  const history = getHistory();
  const timestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  results.forEach((item) => {
    history.unshift({ ...item, scannedAt: timestamp });
  });
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
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
        <div class="result-product">${item.product || "Unknown Product"}</div>
        <button class="btn-delete" data-index="${i}" title="Remove">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="result-fields">
        <div class="result-field">
          <span class="field-label">Lot Number</span>
          <span class="field-value">${item.lot || "Not found"}</span>
        </div>
        <div class="result-field">
          <span class="field-label">Expiry Date</span>
          <span class="field-value">${item.expiry || "Not found"}</span>
        </div>
      </div>
      <div class="history-timestamp">${item.scannedAt}</div>
    </div>
  `
    )
    .join("");

  // Attach delete handlers
  historyOutput.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const history = getHistory();
      history.splice(index, 1);
      saveHistory(history);
      renderHistory();
    });
  });
}

// Render history on page load
renderHistory();

// Tap to upload
dropZone.addEventListener("click", () => {
  if (!currentImageData) fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

// Drag and drop (iPad support)
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
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageData = e.target.result;
    previewImg.src = currentImageData;
    previewImg.classList.remove("hidden");
    dropPlaceholder.classList.add("hidden");
    removeBtn.classList.remove("hidden");
    scanBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener("click", () => {
  currentImageData = null;
  previewImg.src = "";
  previewImg.classList.add("hidden");
  dropPlaceholder.classList.remove("hidden");
  removeBtn.classList.add("hidden");
  scanBtn.disabled = true;
  fileInput.value = "";
});

scanBtn.addEventListener("click", scanImage);

copyBtn.addEventListener("click", async () => {
  copyToClipboard(resultsOutput, copyBtn);
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
    saveHistory([]);
    renderHistory();
  }
});

newScanBtn.addEventListener("click", () => {
  resultsSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  currentImageData = null;
  previewImg.src = "";
  previewImg.classList.add("hidden");
  dropPlaceholder.classList.remove("hidden");
  removeBtn.classList.add("hidden");
  scanBtn.disabled = true;
  fileInput.value = "";
});

retryBtn.addEventListener("click", () => {
  errorSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
});

async function scanImage() {
  if (!currentImageData) return;

  uploadSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  loadingSection.classList.remove("hidden");

  try {
    const res = await fetch("/api/scan-lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: currentImageData }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Scan failed");

    resultsOutput.innerHTML = formatResults(data.results);
    loadingSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");

    // Add to history
    if (data.results && data.results.length > 0) {
      addToHistory(data.results);
    }
  } catch (err) {
    loadingSection.classList.add("hidden");
    errorMsg.textContent = err.message;
    errorSection.classList.remove("hidden");
  }
}

function formatResults(results) {
  if (!results || results.length === 0) {
    return '<p class="no-results">No lot numbers or expiry dates found in the image.</p>';
  }

  return results
    .map(
      (item) => `
    <div class="result-card">
      <div class="result-product">${item.product || "Unknown Product"}</div>
      <div class="result-fields">
        <div class="result-field">
          <span class="field-label">Lot Number</span>
          <span class="field-value">${item.lot || "Not found"}</span>
        </div>
        <div class="result-field">
          <span class="field-label">Expiry Date</span>
          <span class="field-value">${item.expiry || "Not found"}</span>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}
