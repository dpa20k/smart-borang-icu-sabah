const defaultForms = [
  { id: "ICU-PROJ-014", name: "Laporan Kemajuan Projek", category: "Projek Pembangunan", version: "v3.2", status: "Aktif", source: "Template sistem" },
  { id: "ICU-PROJ-021", name: "Borang Pemantauan Tapak", category: "Projek Pembangunan", version: "v2.5", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KEW-008", name: "Permohonan Peruntukan", category: "Kewangan", version: "v4.0", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KEW-012", name: "Laporan Perbelanjaan", category: "Kewangan", version: "v1.8", status: "Draf", source: "Template sistem" },
  { id: "ICU-ISO-003", name: "Audit Dalaman ISO 9001:2015", category: "Audit & Kualiti", version: "v5.1", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KES-006", name: "Borang Lawatan Lapangan eKasih", category: "Kesejahteraan", version: "v2.1", status: "Aktif", source: "Template sistem" },
  { id: "ICU-HR-004", name: "Tuntutan Elaun Perjalanan", category: "HR & Pentadbiran", version: "v3.0", status: "Aktif", source: "Template sistem" }
];

let forms = loadForms();

const approvals = [
  { id: "ICU-PROJ-014", title: "Laporan Kemajuan Projek", owner: "Pegawai Pembangunan S32", age: "9 hari" },
  { id: "ICU-KEW-008", title: "Permohonan Peruntukan", owner: "Unit Kewangan", age: "3 hari" },
  { id: "ICU-ISO-003", title: "Tindakan Pembetulan Audit", owner: "Wakil Pengurusan Kualiti", age: "6 hari" }
];

const permissionMatrix = {
  Pegawai: [
    ["Isi borang", "Ya"],
    ["Simpan draf", "Ya"],
    ["Lulus borang", "Tidak"],
    ["Lihat laporan semua unit", "Tidak"]
  ],
  "Ketua Unit": [
    ["Isi borang", "Ya"],
    ["Semak borang unit", "Ya"],
    ["Lulus peringkat unit", "Ya"],
    ["Lihat laporan unit", "Ya"]
  ],
  Pengarah: [
    ["Kelulusan akhir", "Ya"],
    ["Lihat semua dashboard", "Ya"],
    ["Eksport laporan tahunan", "Ya"],
    ["Urus akses sistem", "Ya"]
  ]
};

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const formsTable = document.querySelector("#formsTable");
const approvalList = document.querySelector("#approvalList");
const roleSelect = document.querySelector("#roleSelect");
const permissions = document.querySelector("#permissions");
const formMessage = document.querySelector("#formMessage");
const addForm = document.querySelector("#addForm");
const uploadForm = document.querySelector("#uploadForm");
const repositoryMessage = document.querySelector("#repositoryMessage");
const onlineFormTitle = document.querySelector("#onlineFormTitle");
const onlineFormSource = document.querySelector("#onlineFormSource");
const printTitle = document.querySelector("#printTitle");
const printCode = document.querySelector("#printCode");
const aiExtractType = document.querySelector("#aiExtractType");
const extractOutput = document.querySelector("#extractOutput");
const checkOutput = document.querySelector("#checkOutput");
const summaryInput = document.querySelector("#summaryInput");
const summaryOutput = document.querySelector("#summaryOutput");
const chatWindow = document.querySelector("#chatWindow");
const chatInput = document.querySelector("#chatInput");

const aiFieldSuggestions = {
  "Laporan Kemajuan Projek": ["No. Projek", "Daerah", "Tarikh Lawatan", "Pegawai Bertugas", "Status Semasa", "Catatan Lawatan", "Isu Kritikal"],
  "Permohonan Peruntukan": ["Nama Pemohon", "Unit", "Jumlah Peruntukan", "Tujuan Permohonan", "Kod Projek", "Dokumen Sokongan"],
  "Audit Dalaman ISO 9001:2015": ["No. Audit", "Klausa ISO", "Dapatan Audit", "Kategori Ketidakpatuhan", "Tindakan Pembetulan", "Tarikh Sasaran"],
  "Tuntutan Elaun Perjalanan": ["Nama Pegawai", "No. Kakitangan", "Destinasi", "Tarikh Perjalanan", "Jumlah Tuntutan", "Resit Sokongan"]
};

function loadForms() {
  const saved = localStorage.getItem("smartBorangForms");
  return saved ? JSON.parse(saved) : [...defaultForms];
}

function saveForms() {
  localStorage.setItem("smartBorangForms", JSON.stringify(forms));
}

function showRepositoryMessage(message, isError = false) {
  repositoryMessage.textContent = message;
  repositoryMessage.classList.toggle("error", isError);
}

function switchView(sectionId) {
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.section === sectionId));
  views.forEach((view) => view.classList.toggle("active", view.id === sectionId));
}

function renderForms() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = forms.filter((form) => {
    const matchesCategory = category === "Semua" || form.category === category;
    const matchesQuery = [form.id, form.name, form.category].some((value) => value.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  formsTable.innerHTML = filtered.map((form) => `
    <tr>
      <td><strong>${form.id}</strong></td>
      <td>${form.name}</td>
      <td>${form.category}</td>
      <td>${form.version}</td>
      <td><span class="status-pill ${form.status === "Draf" ? "draft" : "active"}">${form.status}</span></td>
      <td>${form.source || "Template sistem"}</td>
      <td>
        <button type="button" class="fill-button" data-fill="${form.id}">Isi Online</button>
        <button type="button" class="print-button" data-print="${form.id}">Print Manual</button>
        <button type="button" class="remove-button" data-remove="${form.id}">Buang</button>
      </td>
    </tr>
  `).join("");
}

function openOnlineForm(form) {
  onlineFormTitle.textContent = form.name;
  onlineFormSource.textContent = `No. ${form.id} | ${form.category} | ${form.source || "Template sistem"}`;
  document.querySelector("input[name='formCode']").value = form.id;
  document.querySelector("input[name='formName']").value = form.name;
  formMessage.textContent = "";
  switchView("fill");
}

function printManualForm(form) {
  printTitle.textContent = form.name;
  printCode.textContent = `${form.id} | ${form.category} | ${form.version}`;
  showRepositoryMessage(`${form.id} disediakan untuk cetakan manual.`);
  window.print();
}

function renderApprovals() {
  approvalList.innerHTML = approvals.map((item) => `
    <article class="approval-card">
      <div>
        <strong>${item.id}</strong>
        <p>${item.title} oleh ${item.owner}</p>
        <span class="badge">Menunggu ${item.age}</span>
      </div>
      <button type="button">Semak</button>
    </article>
  `).join("");
}

function renderPermissions() {
  const rows = permissionMatrix[roleSelect.value];
  permissions.innerHTML = rows.map(([label, value]) => `
    <div class="permission-row">
      <span>${label}</span>
      <span>${value}</span>
    </div>
  `).join("");
}

function renderList(target, items) {
  target.innerHTML = `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function getChatReply(text) {
  const query = text.toLowerCase();

  if (query.includes("tuntut") || query.includes("elaun") || query.includes("perjalanan")) {
    return "Cadangan: gunakan borang Tuntutan Elaun Perjalanan di kategori HR & Pentadbiran. Jika perlu, pilih Print Manual untuk borang fizikal atau Isi Online untuk hantar kelulusan.";
  }

  if (query.includes("peruntukan") || query.includes("kewangan") || query.includes("bayaran")) {
    return "Cadangan: gunakan borang Permohonan Peruntukan di kategori Kewangan. Pastikan jumlah, tujuan permohonan dan dokumen sokongan lengkap sebelum hantar.";
  }

  if (query.includes("projek") || query.includes("tapak") || query.includes("kemajuan")) {
    return "Cadangan: gunakan Laporan Kemajuan Projek atau Borang Pemantauan Tapak. AI boleh ringkaskan isu projek untuk Ketua Unit.";
  }

  if (query.includes("audit") || query.includes("iso")) {
    return "Cadangan: gunakan borang Audit Dalaman ISO 9001:2015. Lengkapkan klausa, dapatan audit dan tindakan pembetulan.";
  }

  return "Saya cadangkan cari borang melalui Repositori dahulu. Jika belum ada, upload borang dan gunakan AI Auto-Extract untuk cadangkan field online.";
}

function addChatMessage(message, type) {
  const node = document.createElement("div");
  node.className = `chat-message ${type}-message`;
  node.textContent = message;
  chatWindow.appendChild(node);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => switchView(item.dataset.section));
});

searchInput.addEventListener("input", renderForms);
categoryFilter.addEventListener("change", renderForms);
roleSelect.addEventListener("change", renderPermissions);

document.querySelector("#runExtract").addEventListener("click", () => {
  const selected = aiExtractType.value;
  renderList(extractOutput, aiFieldSuggestions[selected]);
});

document.querySelector("#runCheck").addEventListener("click", () => {
  const form = document.querySelector("#digitalForm");
  const missing = [...form.querySelectorAll("input[required], textarea[required], select[required]")]
    .filter((field) => !field.value.trim())
    .map((field) => field.closest("label")?.childNodes[0]?.textContent.trim() || field.name);

  if (missing.length) {
    renderList(checkOutput, [
      "Status: Perlu pembetulan sebelum dihantar.",
      `Medan belum lengkap: ${missing.join(", ")}.`,
      "Cadangan AI: lengkapkan maklumat wajib dan semak format tarikh."
    ]);
    return;
  }

  renderList(checkOutput, [
    "Status: Borang kelihatan lengkap untuk dihantar.",
    "Tiada medan wajib yang kosong dikesan.",
    "Cadangan AI: semak dokumen sokongan sebelum kelulusan Ketua Unit."
  ]);
});

document.querySelector("#runSummary").addEventListener("click", () => {
  const text = summaryInput.value.trim();
  const source = text || document.querySelector("textarea[name='notes']").value.trim();
  const shortText = source || "Projek berada dalam pemantauan. Tiada catatan terperinci dimasukkan oleh pengguna.";

  renderList(summaryOutput, [
    `Ringkasan: ${shortText.slice(0, 150)}${shortText.length > 150 ? "..." : ""}`,
    "Isu utama: semakan status dan dokumen sokongan diperlukan.",
    "Cadangan tindakan: Ketua Unit boleh membuat semakan awal sebelum dihantar ke kelulusan akhir."
  ]);
});

document.querySelector("#sendChat").addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (!message) return;

  addChatMessage(message, "user");
  addChatMessage(getChatReply(message), "ai");
  chatInput.value = "";
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#sendChat").click();
  }
});

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(addForm);
  const newForm = {
    id: data.get("id").trim().toUpperCase(),
    name: data.get("name").trim(),
    category: data.get("category"),
    version: data.get("version").trim(),
    status: data.get("status"),
    source: "Daftar manual"
  };

  const alreadyExists = forms.some((form) => form.id === newForm.id);
  if (alreadyExists) {
    showRepositoryMessage("No. borang sudah wujud. Sila guna nombor lain.", true);
    return;
  }

  forms = [newForm, ...forms];
  saveForms();
  renderForms();
  addForm.reset();
  addForm.elements.version.value = "v1.0";
  showRepositoryMessage(`${newForm.id} berjaya ditambah.`);
});

uploadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(uploadForm);
  const file = data.get("uploadFile");
  const uploadId = data.get("uploadId").trim().toUpperCase();

  if (!file || !file.name) {
    showRepositoryMessage("Sila pilih fail borang untuk upload.", true);
    return;
  }

  const alreadyExists = forms.some((form) => form.id === uploadId);
  if (alreadyExists) {
    showRepositoryMessage("No. borang upload sudah wujud. Sila guna nombor lain.", true);
    return;
  }

  const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const uploadedForm = {
    id: uploadId,
    name: cleanName,
    category: data.get("uploadCategory"),
    version: "v1.0",
    status: "Aktif",
    source: `Upload: ${file.name}`,
    fileName: file.name,
    fileSize: file.size
  };

  forms = [uploadedForm, ...forms];
  saveForms();
  renderForms();
  uploadForm.reset();
  showRepositoryMessage(`${uploadId} berjaya diupload. Borang boleh diisi online atau dicetak manual.`);
});

formsTable.addEventListener("click", (event) => {
  const fillId = event.target.dataset.fill;
  const printId = event.target.dataset.print;
  const removeId = event.target.dataset.remove;

  if (fillId) {
    const selectedForm = forms.find((form) => form.id === fillId);
    if (selectedForm) openOnlineForm(selectedForm);
    return;
  }

  if (printId) {
    const selectedForm = forms.find((form) => form.id === printId);
    if (selectedForm) printManualForm(selectedForm);
    return;
  }

  if (!removeId) return;

  forms = forms.filter((form) => form.id !== removeId);
  saveForms();
  renderForms();
  showRepositoryMessage(`${removeId} telah dibuang daripada repositori prototype.`);
});

document.querySelector("#saveDraft").addEventListener("click", () => {
  formMessage.textContent = "Draf berjaya disimpan dalam prototype.";
});

document.querySelector("#digitalForm").addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "Borang dihantar kepada Ketua Unit untuk semakan.";
});

document.querySelector("input[name='visitDate']").valueAsDate = new Date();

renderForms();
renderApprovals();
renderPermissions();
