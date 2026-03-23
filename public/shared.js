// --- Shared localStorage helpers ---

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getPatients() {
  try { return JSON.parse(localStorage.getItem("patients") || "[]"); } catch { return []; }
}
function savePatients(arr) { localStorage.setItem("patients", JSON.stringify(arr)); }

function getPatientNotes() {
  try { return JSON.parse(localStorage.getItem("patientNotes") || "[]"); } catch { return []; }
}
function savePatientNotes(arr) { localStorage.setItem("patientNotes", JSON.stringify(arr)); }

function getLotLinks() {
  try { return JSON.parse(localStorage.getItem("lotLinks") || "[]"); } catch { return []; }
}
function saveLotLinks(arr) { localStorage.setItem("lotLinks", JSON.stringify(arr)); }

function getNotesHistory() {
  try { return JSON.parse(localStorage.getItem("notesHistory") || "[]"); } catch { return []; }
}
function saveNotesHistory(arr) { localStorage.setItem("notesHistory", JSON.stringify(arr)); }

function getScanHistory() {
  try { return JSON.parse(localStorage.getItem("scanHistory") || "[]"); } catch { return []; }
}
function saveScanHistory(arr) { localStorage.setItem("scanHistory", JSON.stringify(arr)); }

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDob(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
