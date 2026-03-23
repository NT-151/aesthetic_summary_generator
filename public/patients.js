// --- DOM refs ---
const patientsListSection = document.getElementById("patients-list-section");
const createSection = document.getElementById("create-section");
const detailSection = document.getElementById("detail-section");

const addPatientBtn = document.getElementById("add-patient-btn");
const patientSearch = document.getElementById("patient-search");
const patientList = document.getElementById("patient-list");
const noPatients = document.getElementById("no-patients");

const formTitle = document.getElementById("form-title");
const editPatientId = document.getElementById("edit-patient-id");
const patientNameInput = document.getElementById("patient-name");
const patientDobInput = document.getElementById("patient-dob");
const patientPhoneInput = document.getElementById("patient-phone");
const cancelCreateBtn = document.getElementById("cancel-create-btn");
const savePatientBtn = document.getElementById("save-patient-btn");

const backBtn = document.getElementById("back-btn");
const editPatientBtn = document.getElementById("edit-patient-btn");
const deletePatientBtn = document.getElementById("delete-patient-btn");
const patientInfo = document.getElementById("patient-info");
const patientNotesEl = document.getElementById("patient-notes");
const noNotes = document.getElementById("no-notes");
const patientLotsEl = document.getElementById("patient-lots");
const noLots = document.getElementById("no-lots");
const linkLotBtn = document.getElementById("link-lot-btn");
const lotDropdown = document.getElementById("lot-dropdown");
const closeLotDropdown = document.getElementById("close-lot-dropdown");

const lotPickerList = document.getElementById("lot-picker-list");
const noAvailableLots = document.getElementById("no-available-lots");
const confirmLotLinkBtn = document.getElementById("confirm-lot-link-btn");

let currentPatientId = null;
let selectedLotIds = new Set();

// --- Sections ---
function showPatientSection(section) {
  [patientsListSection, createSection, detailSection].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
  lotDropdown.classList.add("hidden");
}

// --- Patient List ---
function renderPatientList(filter = "") {
  const patients = getPatients();
  const filtered = filter
    ? patients.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    : patients;

  if (filtered.length === 0) {
    patientList.innerHTML = "";
    noPatients.classList.remove("hidden");
    noPatients.textContent = filter ? "No patients match your search." : "No patients yet. Tap + New to add one.";
    return;
  }

  noPatients.classList.add("hidden");
  patientList.innerHTML = filtered.map(p => {
    const noteCount = getPatientNotes().filter(n => n.patientId === p.id).length;
    const lotCount = getLotLinks().filter(l => l.patientId === p.id).length;
    return `
      <div class="patient-row" data-id="${p.id}">
        <div class="patient-row-info">
          <div class="patient-row-name">${escapeHtml(p.name)}</div>
          <div class="patient-row-meta">
            ${p.dob ? formatDob(p.dob) : ""}${p.dob && (noteCount || lotCount) ? " · " : ""}${noteCount ? noteCount + " note" + (noteCount > 1 ? "s" : "") : ""}${noteCount && lotCount ? ", " : ""}${lotCount ? lotCount + " lot" + (lotCount > 1 ? "s" : "") : ""}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    `;
  }).join("");

  patientList.querySelectorAll(".patient-row").forEach(row => {
    row.addEventListener("click", () => showPatientDetail(row.dataset.id));
  });
}

// --- Create / Edit Patient ---
addPatientBtn.addEventListener("click", () => {
  formTitle.textContent = "New Patient";
  editPatientId.value = "";
  patientNameInput.value = "";
  patientDobInput.value = "";
  patientPhoneInput.value = "";
  savePatientBtn.disabled = true;
  showPatientSection(createSection);
  patientNameInput.focus();
});

patientNameInput.addEventListener("input", () => {
  savePatientBtn.disabled = !patientNameInput.value.trim();
});

cancelCreateBtn.addEventListener("click", () => {
  if (currentPatientId && editPatientId.value) {
    showPatientSection(detailSection);
  } else {
    showPatientSection(patientsListSection);
  }
});

savePatientBtn.addEventListener("click", () => {
  const name = patientNameInput.value.trim();
  if (!name) return;

  const patients = getPatients();
  const id = editPatientId.value;

  if (id) {
    const idx = patients.findIndex(p => p.id === id);
    if (idx !== -1) {
      patients[idx].name = name;
      patients[idx].dob = patientDobInput.value || "";
      patients[idx].phone = patientPhoneInput.value.trim() || "";
    }
    savePatients(patients);
    showPatientDetail(id);
  } else {
    const patient = {
      id: generateId(),
      name,
      dob: patientDobInput.value || "",
      phone: patientPhoneInput.value.trim() || "",
      createdAt: new Date().toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
    };
    patients.unshift(patient);
    savePatients(patients);
    showPatientDetail(patient.id);
  }
});

// --- Patient Detail ---
function showPatientDetail(id) {
  currentPatientId = id;
  const patients = getPatients();
  const patient = patients.find(p => p.id === id);
  if (!patient) return;

  showPatientSection(detailSection);

  patientInfo.innerHTML = `
    <h2 class="patient-detail-name">${escapeHtml(patient.name)}</h2>
    <div class="patient-detail-fields">
      ${patient.dob ? `<div class="patient-detail-field"><span class="field-label">Date of Birth</span><span class="field-value">${formatDob(patient.dob)}</span></div>` : ""}
      ${patient.phone ? `<div class="patient-detail-field"><span class="field-label">Phone</span><span class="field-value">${escapeHtml(patient.phone)}</span></div>` : ""}
      <div class="patient-detail-field"><span class="field-label">Added</span><span class="field-value">${patient.createdAt}</span></div>
    </div>
  `;

  renderPatientNotes(id);
  renderPatientLots(id);
}

function renderPatientNotes(patientId) {
  const notes = getPatientNotes().filter(n => n.patientId === patientId);
  if (notes.length === 0) {
    patientNotesEl.innerHTML = "";
    noNotes.classList.remove("hidden");
    return;
  }
  noNotes.classList.add("hidden");
  patientNotesEl.innerHTML = notes.map(n => `
    <div class="result-card note-card">
      <div class="note-card-header">
        <input class="note-name-input" type="text" value="${escapeAttr(n.name || n.createdAt)}" data-note-id="${n.id}">
        <button class="btn-delete" data-note-id="${n.id}" title="Remove note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="history-timestamp">${n.createdAt}</div>
      <div class="notes-content note-preview">${formatNotesHtml(n.content)}</div>
    </div>
  `).join("");

  // Rename on blur or enter
  patientNotesEl.querySelectorAll(".note-name-input").forEach(input => {
    function saveNoteName() {
      const newName = input.value.trim();
      if (!newName) return;
      const allNotes = getPatientNotes();
      const note = allNotes.find(n => n.id === input.dataset.noteId);
      if (note && note.name !== newName) {
        note.name = newName;
        savePatientNotes(allNotes);
      }
    }
    input.addEventListener("blur", saveNoteName);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    });
  });

  patientNotesEl.querySelectorAll(".btn-delete[data-note-id]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Remove this note from the patient?")) {
        const allNotes = getPatientNotes();
        const idx = allNotes.findIndex(n => n.id === btn.dataset.noteId);
        if (idx !== -1) allNotes.splice(idx, 1);
        savePatientNotes(allNotes);
        renderPatientNotes(patientId);
      }
    });
  });
}

function renderPatientLots(patientId) {
  const links = getLotLinks().filter(l => l.patientId === patientId);
  const history = getScanHistory();

  if (links.length === 0) {
    patientLotsEl.innerHTML = "";
    noLots.classList.remove("hidden");
    return;
  }

  noLots.classList.add("hidden");
  const items = links.map(link => {
    const lot = history.find(h => h.id === link.lotId);
    return lot ? { ...lot, linkLotId: link.lotId } : null;
  }).filter(Boolean);

  if (items.length === 0) {
    patientLotsEl.innerHTML = "";
    noLots.classList.remove("hidden");
    return;
  }

  patientLotsEl.innerHTML = items.map(item => `
    <div class="result-card">
      <div class="history-card-header">
        <div class="result-product">${escapeHtml(item.product || "Unknown Product")}</div>
        <button class="btn-delete" data-lot-id="${item.linkLotId}" title="Unlink lot">
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
      ${item.scannedAt ? `<div class="history-timestamp">Scanned ${item.scannedAt}</div>` : ""}
    </div>
  `).join("");

  patientLotsEl.querySelectorAll(".btn-delete[data-lot-id]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const links = getLotLinks();
      const idx = links.findIndex(l => l.lotId === btn.dataset.lotId && l.patientId === patientId);
      if (idx !== -1) links.splice(idx, 1);
      saveLotLinks(links);
      renderPatientLots(patientId);
    });
  });
}

// --- Link Lot Dropdown ---
linkLotBtn.addEventListener("click", () => {
  const isOpen = !lotDropdown.classList.contains("hidden");
  if (isOpen) {
    lotDropdown.classList.add("hidden");
    return;
  }

  const history = getScanHistory();
  const existingLinks = getLotLinks().filter(l => l.patientId === currentPatientId);
  const linkedLotIds = new Set(existingLinks.map(l => l.lotId));
  const available = history.filter(h => h.id && !linkedLotIds.has(h.id));

  selectedLotIds.clear();
  confirmLotLinkBtn.disabled = true;

  if (available.length === 0) {
    lotPickerList.innerHTML = "";
    noAvailableLots.classList.remove("hidden");
    confirmLotLinkBtn.classList.add("hidden");
  } else {
    noAvailableLots.classList.add("hidden");
    confirmLotLinkBtn.classList.remove("hidden");
    lotPickerList.innerHTML = available.map(item => `
      <div class="dropdown-item lot-picker-item" data-lot-id="${item.id}">
        <div class="dropdown-item-main">
          <span class="dropdown-item-name">${escapeHtml(item.product || "Unknown Product")}</span>
          <span class="dropdown-item-detail">${escapeHtml(item.lot || "N/A")} · ${escapeHtml(item.expiry || "N/A")}</span>
        </div>
        <div class="dropdown-check hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
    `).join("");

    lotPickerList.querySelectorAll(".lot-picker-item").forEach(el => {
      el.addEventListener("click", () => {
        const lotId = el.dataset.lotId;
        const check = el.querySelector(".dropdown-check");
        if (selectedLotIds.has(lotId)) {
          selectedLotIds.delete(lotId);
          el.classList.remove("selected");
          check.classList.add("hidden");
        } else {
          selectedLotIds.add(lotId);
          el.classList.add("selected");
          check.classList.remove("hidden");
        }
        confirmLotLinkBtn.disabled = selectedLotIds.size === 0;
        confirmLotLinkBtn.textContent = selectedLotIds.size > 0
          ? `Link ${selectedLotIds.size} Lot${selectedLotIds.size > 1 ? "s" : ""}`
          : "Link Selected";
      });
    });
  }

  lotDropdown.classList.remove("hidden");
});

closeLotDropdown.addEventListener("click", () => {
  lotDropdown.classList.add("hidden");
});

confirmLotLinkBtn.addEventListener("click", () => {
  const links = getLotLinks();
  selectedLotIds.forEach(lotId => {
    if (!links.some(l => l.lotId === lotId && l.patientId === currentPatientId)) {
      links.push({ lotId, patientId: currentPatientId });
    }
  });
  saveLotLinks(links);
  lotDropdown.classList.add("hidden");
  renderPatientLots(currentPatientId);
});

// --- Edit / Delete ---
editPatientBtn.addEventListener("click", () => {
  const patient = getPatients().find(p => p.id === currentPatientId);
  if (!patient) return;
  formTitle.textContent = "Edit Patient";
  editPatientId.value = patient.id;
  patientNameInput.value = patient.name;
  patientDobInput.value = patient.dob || "";
  patientPhoneInput.value = patient.phone || "";
  savePatientBtn.disabled = false;
  showPatientSection(createSection);
  patientNameInput.focus();
});

deletePatientBtn.addEventListener("click", () => {
  if (!confirm("Delete this patient and all linked data?")) return;
  const patients = getPatients().filter(p => p.id !== currentPatientId);
  savePatients(patients);
  const notes = getPatientNotes().filter(n => n.patientId !== currentPatientId);
  savePatientNotes(notes);
  const links = getLotLinks().filter(l => l.patientId !== currentPatientId);
  saveLotLinks(links);
  currentPatientId = null;
  showPatientSection(patientsListSection);
  renderPatientList();
});

backBtn.addEventListener("click", () => {
  currentPatientId = null;
  showPatientSection(patientsListSection);
  renderPatientList();
});

// --- Search ---
patientSearch.addEventListener("input", () => {
  renderPatientList(patientSearch.value);
});

function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatNotesHtml(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

// --- Init ---
renderPatientList();
