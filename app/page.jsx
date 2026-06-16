"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const defaultForms = [
  { id: "ICU-PROJ-014", name: "Laporan Kemajuan Projek", category: "Projek Pembangunan", version: "v3.2", status: "Aktif", source: "Template sistem" },
  { id: "ICU-PROJ-021", name: "Borang Pemantauan Tapak", category: "Projek Pembangunan", version: "v2.5", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KEW-008", name: "Permohonan Peruntukan", category: "Kewangan", version: "v4.0", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KEW-012", name: "Laporan Perbelanjaan", category: "Kewangan", version: "v1.8", status: "Draf", source: "Template sistem" },
  { id: "ICU-ISO-003", name: "Audit Dalaman ISO 9001:2015", category: "Audit & Kualiti", version: "v5.1", status: "Aktif", source: "Template sistem" },
  { id: "ICU-KES-006", name: "Borang Lawatan Lapangan eKasih", category: "Kesejahteraan", version: "v2.1", status: "Aktif", source: "Template sistem" },
  { id: "ICU-HR-004", name: "Tuntutan Elaun Perjalanan", category: "HR & Pentadbiran", version: "v3.0", status: "Aktif", source: "Template sistem" }
];

const categories = ["Projek Pembangunan", "Kewangan", "Audit & Kualiti", "Kesejahteraan", "HR & Pentadbiran"];

const approvals = [
  { id: "ICU-PROJ-014", title: "Laporan Kemajuan Projek", owner: "Pegawai Pembangunan S32", age: "9 hari" },
  { id: "ICU-KEW-008", title: "Permohonan Peruntukan", owner: "Unit Kewangan", age: "3 hari" },
  { id: "ICU-ISO-003", title: "Tindakan Pembetulan Audit", owner: "Wakil Pengurusan Kualiti", age: "6 hari" }
];

const permissionMatrix = {
  Pegawai: [["Isi borang", "Ya"], ["Simpan draf", "Ya"], ["Lulus borang", "Tidak"], ["Lihat laporan semua unit", "Tidak"]],
  "Ketua Unit": [["Isi borang", "Ya"], ["Semak borang unit", "Ya"], ["Lulus peringkat unit", "Ya"], ["Lihat laporan unit", "Ya"]],
  Pengarah: [["Kelulusan akhir", "Ya"], ["Lihat semua dashboard", "Ya"], ["Eksport laporan tahunan", "Ya"], ["Urus akses sistem", "Ya"]]
};

const aiFieldSuggestions = {
  "Laporan Kemajuan Projek": ["No. Projek", "Daerah", "Tarikh Lawatan", "Pegawai Bertugas", "Status Semasa", "Catatan Lawatan", "Isu Kritikal"],
  "Permohonan Peruntukan": ["Nama Pemohon", "Unit", "Jumlah Peruntukan", "Tujuan Permohonan", "Kod Projek", "Dokumen Sokongan"],
  "Audit Dalaman ISO 9001:2015": ["No. Audit", "Klausa ISO", "Dapatan Audit", "Kategori Ketidakpatuhan", "Tindakan Pembetulan", "Tarikh Sasaran"],
  "Tuntutan Elaun Perjalanan": ["Nama Pegawai", "No. Kakitangan", "Destinasi", "Tarikh Perjalanan", "Jumlah Tuntutan", "Resit Sokongan"]
};

function mapDbForm(row) {
  return {
    dbId: row.id,
    id: row.form_code,
    name: row.name,
    category: row.category,
    version: row.version,
    status: row.status,
    source: row.source || "Supabase"
  };
}

function mapDbSubmission(row) {
  const payload = row.payload || {};
  return {
    id: row.id,
    formId: row.form_id,
    formCode: payload.form_code || row.forms?.form_code || "-",
    formName: payload.form_name || row.forms?.name || "Borang",
    category: payload.category || row.forms?.category || "-",
    status: row.status,
    notes: payload.notes || "-",
    submittedAt: row.submitted_at || row.created_at
  };
}

function getChatReply(text) {
  const query = text.toLowerCase();
  if (query.includes("tuntut") || query.includes("elaun") || query.includes("perjalanan")) {
    return "Cadangan: gunakan borang Tuntutan Elaun Perjalanan di kategori HR & Pentadbiran.";
  }
  if (query.includes("peruntukan") || query.includes("kewangan") || query.includes("bayaran")) {
    return "Cadangan: gunakan borang Permohonan Peruntukan di kategori Kewangan dan pastikan dokumen sokongan lengkap.";
  }
  if (query.includes("projek") || query.includes("tapak") || query.includes("kemajuan")) {
    return "Cadangan: gunakan Laporan Kemajuan Projek atau Borang Pemantauan Tapak.";
  }
  if (query.includes("audit") || query.includes("iso")) {
    return "Cadangan: gunakan borang Audit Dalaman ISO 9001:2015.";
  }
  return "Cari borang melalui Repositori dahulu. Jika belum ada, upload borang dan gunakan AI Auto-Extract.";
}

export default function SmartBorangApp() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [role, setRole] = useState("Pegawai");
  const [forms, setForms] = useState(defaultForms);
  const [isSupabaseReady, setIsSupabaseReady] = useState(Boolean(supabase));
  const [isLoadingForms, setIsLoadingForms] = useState(Boolean(supabase));
  const [submissions, setSubmissions] = useState([]);
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(Boolean(supabase));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [repoMessage, setRepoMessage] = useState("");
  const [selectedForm, setSelectedForm] = useState(defaultForms[0]);
  const [formMessage, setFormMessage] = useState("");
  const [formFields, setFormFields] = useState({
    projectNo: "SBH-PPN-2026-041",
    district: "Kota Kinabalu",
    visitDate: new Date().toISOString().slice(0, 10),
    officer: "Nur Aina Binti Salleh",
    progress: "Dalam jadual"
  });
  const [notes, setNotes] = useState("");
  const [extractType, setExtractType] = useState("Laporan Kemajuan Projek");
  const [extractOutput, setExtractOutput] = useState([]);
  const [checkOutput, setCheckOutput] = useState([]);
  const [summaryInput, setSummaryInput] = useState("");
  const [summaryOutput, setSummaryOutput] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { type: "ai", text: "Hai, saya boleh bantu cadangkan borang dan langkah proses Smart Borang." }
  ]);

  useEffect(() => {
    async function loadForms() {
      if (!supabase) {
        setIsSupabaseReady(false);
        setIsLoadingForms(false);
        setIsLoadingSubmissions(false);
        return;
      }

      const { data, error } = await supabase
        .from("forms")
        .select("id, form_code, name, category, version, status, source")
        .order("created_at", { ascending: false });

      if (error) {
        setIsSupabaseReady(false);
        setRepoMessage(`Supabase tidak dapat dibaca: ${error.message}. App guna data demo sementara.`);
        setIsLoadingForms(false);
        return;
      }

      setIsSupabaseReady(true);
      setForms(data.length ? data.map(mapDbForm) : defaultForms);
      setIsLoadingForms(false);
    }

    loadForms();
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    if (!supabase) {
      setIsLoadingSubmissions(false);
      return;
    }

    const { data, error } = await supabase
      .from("submissions")
      .select("id, form_id, status, payload, submitted_at, created_at, forms(form_code, name, category)")
      .order("created_at", { ascending: false });

    if (error) {
      setWorkflowMessage(`Gagal memuatkan submissions: ${error.message}`);
      setIsLoadingSubmissions(false);
      return;
    }

    setSubmissions(data.map(mapDbSubmission));
    setIsLoadingSubmissions(false);
  }

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forms.filter((form) => {
      const matchesCategory = category === "Semua" || form.category === category;
      const matchesQuery = [form.id, form.name, form.category].some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }, [forms, search, category]);

  async function addManualForm(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newForm = {
      id: data.get("id").trim().toUpperCase(),
      name: data.get("name").trim(),
      category: data.get("category"),
      version: data.get("version").trim(),
      status: data.get("status"),
      source: "Daftar manual"
    };
    if (forms.some((form) => form.id === newForm.id)) {
      setRepoMessage("No. borang sudah wujud. Sila guna nombor lain.");
      return;
    }

    if (supabase && isSupabaseReady) {
      const { data: inserted, error } = await supabase
        .from("forms")
        .insert({
          form_code: newForm.id,
          name: newForm.name,
          category: newForm.category,
          version: newForm.version,
          status: newForm.status,
          source: newForm.source
        })
        .select("id, form_code, name, category, version, status, source")
        .single();

      if (error) {
        setRepoMessage(`Gagal tambah ke Supabase: ${error.message}`);
        return;
      }

      setForms([mapDbForm(inserted), ...forms]);
      setRepoMessage(`${newForm.id} berjaya ditambah ke Supabase.`);
      event.currentTarget.reset();
      return;
    }

    setForms([newForm, ...forms]);
    setRepoMessage(`${newForm.id} berjaya ditambah.`);
    event.currentTarget.reset();
  }

  async function uploadForm(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("uploadFile");
    const uploadId = data.get("uploadId").trim().toUpperCase();
    if (!file?.name) {
      setRepoMessage("Sila pilih fail borang untuk upload.");
      return;
    }
    if (forms.some((form) => form.id === uploadId)) {
      setRepoMessage("No. borang upload sudah wujud. Sila guna nombor lain.");
      return;
    }
    const uploadedForm = {
      id: uploadId,
      name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      category: data.get("uploadCategory"),
      version: "v1.0",
      status: "Aktif",
      source: `Upload: ${file.name}`
    };

    if (supabase && isSupabaseReady) {
      const storagePath = `${uploadId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("form-templates")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        setRepoMessage(`Gagal upload fail ke Supabase Storage: ${uploadError.message}`);
        return;
      }

      const { data: inserted, error: formError } = await supabase
        .from("forms")
        .insert({
          form_code: uploadedForm.id,
          name: uploadedForm.name,
          category: uploadedForm.category,
          version: uploadedForm.version,
          status: uploadedForm.status,
          source: uploadedForm.source
        })
        .select("id, form_code, name, category, version, status, source")
        .single();

      if (formError) {
        setRepoMessage(`Fail sudah upload, tetapi rekod borang gagal disimpan: ${formError.message}`);
        return;
      }

      const { error: fileError } = await supabase
        .from("form_files")
        .insert({
          form_id: inserted.id,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size: file.size
        });

      if (fileError) {
        setRepoMessage(`Borang disimpan, tetapi metadata fail gagal: ${fileError.message}`);
      } else {
        setRepoMessage(`${uploadId} berjaya diupload ke Supabase Storage dan direkodkan.`);
      }

      setForms([mapDbForm(inserted), ...forms]);
      event.currentTarget.reset();
      return;
    }

    setForms([uploadedForm, ...forms]);
    setRepoMessage(`${uploadId} berjaya diupload. Borang boleh diisi online atau dicetak manual.`);
    event.currentTarget.reset();
  }

  function openOnlineForm(form) {
    setSelectedForm(form);
    setFormMessage("");
    setActiveSection("fill");
  }

  function updateFormField(name, value) {
    setFormFields((current) => ({ ...current, [name]: value }));
  }

  async function saveSubmission(status) {
    let formDbId = selectedForm.dbId;
    const payload = {
      form_code: selectedForm.id,
      form_name: selectedForm.name,
      category: selectedForm.category,
      ...formFields,
      notes
    };

    if (supabase && !formDbId) {
      const { data: dbForm, error: lookupError } = await supabase
        .from("forms")
        .select("id")
        .eq("form_code", selectedForm.id)
        .single();

      if (lookupError) {
        setFormMessage(`Borang belum dipadankan dengan Supabase: ${lookupError.message}`);
        return;
      }

      formDbId = dbForm.id;
      setSelectedForm((current) => ({ ...current, dbId: formDbId }));
    }

    if (supabase && formDbId) {
      const { error } = await supabase
        .from("submissions")
        .insert({
          form_id: formDbId,
          status,
          payload,
          submitted_at: status === "Dihantar" ? new Date().toISOString() : null
        });

      if (error) {
        setFormMessage(`Gagal simpan submission ke Supabase: ${error.message}`);
        return;
      }

      setFormMessage(status === "Draf" ? "Draf berjaya disimpan ke Supabase." : "Borang berjaya dihantar dan direkodkan dalam Supabase untuk semakan Ketua Unit.");
      loadSubmissions();
      return;
    }

    setFormMessage(
      "Submission belum masuk Supabase. Environment variable Supabase belum aktif di deployment ini atau borang belum wujud dalam table forms."
    );
  }

  async function decideSubmission(submission, decision) {
    if (!supabase) {
      setWorkflowMessage("Supabase env belum aktif pada deployment ini.");
      return;
    }

    const nextStatus = decision === "Diluluskan" ? "Diluluskan" : "Ditolak";
    const { error: stepError } = await supabase
      .from("approval_steps")
      .insert({
        submission_id: submission.id,
        step_name: role === "Pengarah" ? "Kelulusan Akhir" : "Semakan Ketua Unit",
        status: nextStatus,
        comments: decision === "Diluluskan" ? "Diluluskan melalui Smart Borang." : "Ditolak dan perlu semakan semula.",
        decided_at: new Date().toISOString()
      });

    if (stepError) {
      setWorkflowMessage(`Gagal simpan approval step: ${stepError.message}`);
      return;
    }

    const { error: updateError } = await supabase
      .from("submissions")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", submission.id);

    if (updateError) {
      setWorkflowMessage(`Approval direkodkan, tetapi status submission gagal dikemaskini: ${updateError.message}`);
      return;
    }

    setWorkflowMessage(`${submission.formCode} telah ${nextStatus.toLowerCase()} dan direkodkan dalam approval_steps.`);
    setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, status: nextStatus } : item));
  }

  function printManualForm(form) {
    setSelectedForm(form);
    setRepoMessage(`${form.id} disediakan untuk cetakan manual.`);
    setTimeout(() => window.print(), 50);
  }

  function runCheck() {
    if (!notes.trim()) {
      setCheckOutput(["Status: Perlu pembetulan sebelum dihantar.", "Medan belum lengkap: Catatan Lawatan.", "Cadangan AI: lengkapkan catatan dan semak dokumen sokongan."]);
      return;
    }
    setCheckOutput(["Status: Borang kelihatan lengkap untuk dihantar.", "Tiada medan wajib yang kosong dikesan.", "Cadangan AI: semak dokumen sokongan sebelum kelulusan Ketua Unit."]);
  }

  function runSummary() {
    const source = summaryInput.trim() || notes.trim() || "Projek berada dalam pemantauan. Tiada catatan terperinci dimasukkan oleh pengguna.";
    setSummaryOutput([
      `Ringkasan: ${source.slice(0, 150)}${source.length > 150 ? "..." : ""}`,
      "Isu utama: semakan status dan dokumen sokongan diperlukan.",
      "Cadangan tindakan: Ketua Unit boleh membuat semakan awal sebelum dihantar ke kelulusan akhir."
    ]);
  }

  function sendChat() {
    const message = chatInput.trim();
    if (!message) return;
    setChatMessages([...chatMessages, { type: "user", text: message }, { type: "ai", text: getChatReply(message) }]);
    setChatInput("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="/assets/logo-icu-jpm-sabah.png" alt="Logo ICU JPM Sabah" /></div>
          <div><strong>Smart Borang</strong><span>ICU JPM Sabah</span></div>
        </div>
        <nav className="nav" aria-label="Navigasi utama">
          {[
            ["dashboard", "▦", "Dashboard"],
            ["repository", "▤", "Repositori"],
            ["fill", "✎", "Isi Borang"],
            ["workflow", "↻", "Workflow"],
            ["process", "→", "Proses Kerja"],
            ["ai", "AI", "AI Assistant"],
            ["reports", "▥", "Laporan"],
            ["access", "◎", "Akses"]
          ].map(([id, icon, label]) => (
            <button key={id} data-section={id} className={`nav-item ${activeSection === id ? "active" : ""}`} onClick={() => setActiveSection(id)}>
              <span className="icon">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span>Status sistem</span><strong>Next.js Prototype</strong></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="title-block">
            <img className="department-logo" src="/assets/logo-icu-jpm-sabah.png" alt="Logo ICU JPM Sabah" />
            <div><p className="eyebrow">Pejabat Pembangunan Negeri Sabah</p><h1>Smart Borang</h1></div>
          </div>
          <div className="user-panel">
            <label htmlFor="roleSelect">Peranan</label>
            <select id="roleSelect" value={role} onChange={(event) => setRole(event.target.value)}>
              {Object.keys(permissionMatrix).map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </header>

        {activeSection === "dashboard" && <Dashboard />}
        {activeSection === "repository" && (
          <Repository
            forms={filteredForms}
            search={search}
            category={category}
            repoMessage={repoMessage}
            isSupabaseReady={isSupabaseReady}
            isLoadingForms={isLoadingForms}
            onSearch={setSearch}
            onCategory={setCategory}
            onAdd={addManualForm}
            onUpload={uploadForm}
            onFill={openOnlineForm}
            onPrint={printManualForm}
            onRemove={async (form) => {
              if (supabase && isSupabaseReady && form.dbId) {
                const { error } = await supabase.from("forms").delete().eq("id", form.dbId);
                if (error) {
                  setRepoMessage(`Gagal buang dari Supabase: ${error.message}`);
                  return;
                }
                setForms(forms.filter((item) => item.dbId !== form.dbId));
                setRepoMessage(`${form.id} telah dibuang daripada Supabase.`);
                return;
              }

              setForms(forms.filter((item) => item.id !== form.id));
              setRepoMessage(`${form.id} telah dibuang daripada repositori prototype.`);
            }}
          />
        )}
        {activeSection === "fill" && (
          <FillForm
            selectedForm={selectedForm}
            isSupabaseReady={isSupabaseReady}
            formFields={formFields}
            updateFormField={updateFormField}
            notes={notes}
            setNotes={setNotes}
            formMessage={formMessage}
            saveSubmission={saveSubmission}
          />
        )}
        {activeSection === "workflow" && (
          <Workflow
            submissions={submissions}
            isLoadingSubmissions={isLoadingSubmissions}
            workflowMessage={workflowMessage}
            onRefresh={loadSubmissions}
            onDecision={decideSubmission}
          />
        )}
        {activeSection === "process" && <ProcessFlow />}
        {activeSection === "ai" && (
          <AiAssistant
            extractType={extractType}
            setExtractType={setExtractType}
            extractOutput={extractOutput}
            setExtractOutput={setExtractOutput}
            checkOutput={checkOutput}
            runCheck={runCheck}
            summaryInput={summaryInput}
            setSummaryInput={setSummaryInput}
            summaryOutput={summaryOutput}
            runSummary={runSummary}
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            sendChat={sendChat}
          />
        )}
        {activeSection === "reports" && <Reports />}
        {activeSection === "access" && <Access role={role} />}

        <section className="print-sheet" aria-hidden="true">
          <header><p>ICU JPM Sabah</p><h2>{selectedForm.name}</h2><span>{selectedForm.id} | {selectedForm.category} | {selectedForm.version}</span></header>
          <div className="print-field"><strong>Nama Pemohon / Pegawai:</strong><span /></div>
          <div className="print-field"><strong>Unit / Bahagian:</strong><span /></div>
          <div className="print-field"><strong>Tarikh:</strong><span /></div>
          <div className="print-field large"><strong>Butiran / Catatan:</strong><span /></div>
          <div className="print-field"><strong>Tandatangan:</strong><span /></div>
        </section>
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <section className="view active">
      <div className="metric-grid">
        {[
          ["Borang Aktif", "38", "6 kategori rasmi"],
          ["Menunggu Kelulusan", "12", "4 melebihi 7 hari"],
          ["Draf Pengguna", "27", "Disimpan automatik"],
          ["Selesai Bulan Ini", "91", "+18% berbanding Mei"]
        ].map(([label, value, note]) => <article className="metric" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}
      </div>
      <div className="content-grid">
        <section className="panel"><div className="panel-head"><h2>Status Borang</h2><button className="icon-button">↻</button></div><div className="status-bars">
          {["Draf", "Dihantar", "Semakan", "Diluluskan"].map((item, index) => <div key={item}><span>{item}</span><meter value={[27, 35, 18, 91][index]} max="100" /><strong>{[27, 35, 18, 91][index]}</strong></div>)}
        </div></section>
        <section className="panel"><div className="panel-head"><h2>Alert Tindakan</h2><button className="icon-button">☰</button></div><ul className="alert-list">
          {approvals.map((item) => <li key={item.id}><strong>{item.id}</strong><span>{item.title} belum selesai {item.age}</span></li>)}
        </ul></section>
      </div>
    </section>
  );
}

function Repository({ forms, search, category, repoMessage, isSupabaseReady, isLoadingForms, onSearch, onCategory, onAdd, onUpload, onFill, onPrint, onRemove }) {
  return (
    <section className="view active">
      <form className="add-form-panel" onSubmit={onAdd}>
        <div className="panel-head"><div><h2>Tambah Borang</h2><p>Daftar borang baharu ke dalam repositori berpusat.</p></div><span className="badge">Repositori</span></div>
        <div className="add-form-grid">
          <label>No. Borang<input name="id" placeholder="Contoh: ICU-PROJ-030" required /></label>
          <label>Nama Borang<input name="name" placeholder="Contoh: Laporan Isu Projek" required /></label>
          <label>Kategori<SelectCategory name="category" /></label>
          <label>Versi<input name="version" placeholder="v1.0" defaultValue="v1.0" required /></label>
          <label>Status<select name="status" required><option>Aktif</option><option>Draf</option></select></label>
          <button type="submit">Tambah Borang</button>
        </div>
        <p className="message">{repoMessage}</p>
      </form>
      <form className="upload-form-panel" onSubmit={onUpload}>
        <div className="panel-head"><div><h2>Upload Borang</h2><p>Muat naik fail borang untuk diisi secara online atau dicetak bagi pengisian manual.</p></div><span className="badge">PDF / DOCX / XLSX</span></div>
        <div className="upload-form-grid">
          <label>No. Borang<input name="uploadId" placeholder="Contoh: ICU-UP-001" required /></label>
          <label>Kategori<SelectCategory name="uploadCategory" /></label>
          <label>Fail Borang<input name="uploadFile" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" required /></label>
          <button type="submit">Upload Borang</button>
        </div>
      </form>
      <div className="toolbar"><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Cari nombor borang, kategori, atau kata kunci" /><select value={category} onChange={(event) => onCategory(event.target.value)}><option>Semua</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="data-status">
        <span className={`status-dot ${isSupabaseReady ? "online" : "offline"}`} />
        {isLoadingForms ? "Memuatkan data Supabase..." : isSupabaseReady ? "Data disambung ke Supabase" : "Mode demo: Supabase env belum aktif atau belum boleh dibaca"}
      </div>
      <div className="table-wrap"><table><thead><tr><th>No. Borang</th><th>Nama Borang</th><th>Kategori</th><th>Versi</th><th>Status</th><th>Sumber</th><th>Tindakan</th></tr></thead><tbody>
        {forms.map((form) => <tr key={form.dbId || form.id}><td><strong>{form.id}</strong></td><td>{form.name}</td><td>{form.category}</td><td>{form.version}</td><td><span className={`status-pill ${form.status === "Draf" ? "draft" : "active"}`}>{form.status}</span></td><td>{form.source}</td><td><button className="fill-button" onClick={() => onFill(form)} type="button">Isi Online</button> <button className="print-button" onClick={() => onPrint(form)} type="button">Print Manual</button> <button className="remove-button" onClick={() => onRemove(form)} type="button">Buang</button></td></tr>)}
      </tbody></table></div>
    </section>
  );
}

function SelectCategory({ name }) {
  return <select name={name} required>{categories.map((item) => <option key={item}>{item}</option>)}</select>;
}

function FillForm({ selectedForm, isSupabaseReady, formFields, updateFormField, notes, setNotes, formMessage, saveSubmission }) {
  return (
    <section className="view active"><form className="form-panel" onSubmit={(event) => { event.preventDefault(); saveSubmission("Dihantar"); }}>
      <div className="panel-head"><div><h2>{selectedForm.name}</h2><p id="onlineFormSource">No. {selectedForm.id} | {selectedForm.category} | {selectedForm.source}</p></div><span className="badge">Isi Online</span></div>
      <div className="data-status">
        <span className={`status-dot ${supabase ? "online" : "offline"}`} />
        {supabase ? "Supabase aktif. Sistem akan padankan borang ini sebelum simpan submission." : "Supabase env belum aktif pada deployment ini"}
      </div>
      <div className="form-grid">
        <label>No. Borang<input value={selectedForm.id} readOnly /></label><label>Nama Borang<input value={selectedForm.name} readOnly /></label>
        <label>No. Projek<input value={formFields.projectNo} onChange={(event) => updateFormField("projectNo", event.target.value)} required /></label><label>Daerah<input value={formFields.district} onChange={(event) => updateFormField("district", event.target.value)} required /></label>
        <label>Tarikh Lawatan<input type="date" value={formFields.visitDate} onChange={(event) => updateFormField("visitDate", event.target.value)} required /></label><label>Pegawai Bertugas<input value={formFields.officer} onChange={(event) => updateFormField("officer", event.target.value)} required /></label>
        <label className="wide">Status Semasa<select value={formFields.progress} onChange={(event) => updateFormField("progress", event.target.value)}><option>Dalam jadual</option><option>Lewat kurang 30 hari</option><option>Lewat melebihi 30 hari</option><option>Perlu tindakan segera</option></select></label>
        <label className="wide">Catatan Lawatan<textarea rows="5" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Masukkan dapatan pemantauan tapak" /></label>
      </div>
      <div className="actions"><button type="button" className="secondary" onClick={() => saveSubmission("Draf")}>Simpan Draf</button><button type="submit">Hantar Untuk Kelulusan</button></div>
      <p className="message">{formMessage}</p>
    </form></section>
  );
}

function Workflow({ submissions, isLoadingSubmissions, workflowMessage, onRefresh, onDecision }) {
  return (
    <section className="view active">
      <div className="workflow">
        {["Pegawai", "Ketua Unit", "Pengarah", "Arkib"].map((item, index) => (
          <article key={item} className={`step ${index === 0 ? "done" : index === 1 ? "active" : ""}`}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
            <small>{["Borang dihantar", "Semakan dan komen", "Kelulusan akhir", "Rekod audit disimpan"][index]}</small>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Senarai Kelulusan</h2>
            <p className="panel-note">Data ini dibaca daripada table submissions dan keputusan disimpan ke approval_steps.</p>
          </div>
          <button className="icon-button" type="button" onClick={onRefresh}>↻</button>
        </div>
        <p className="message">{workflowMessage}</p>
        <div className="approval-list">
          {isLoadingSubmissions && <article className="approval-card"><div><strong>Memuatkan submissions...</strong><p>Sedang membaca data Supabase.</p></div></article>}
          {!isLoadingSubmissions && submissions.length === 0 && <article className="approval-card"><div><strong>Tiada submission</strong><p>Belum ada borang dihantar untuk kelulusan.</p></div></article>}
          {submissions.map((item) => (
            <article className="approval-card" key={item.id}>
              <div>
                <strong>{item.formCode}</strong>
                <p>{item.formName} | {item.category}</p>
                <p>Catatan: {item.notes}</p>
                <span className="badge">{item.status}</span>
              </div>
              <div className="approval-actions">
                {["Diluluskan", "Ditolak"].includes(item.status) && <span className="decision-complete">Selesai</span>}
                <button type="button" onClick={() => onDecision(item, "Diluluskan")}>Lulus</button>
                <button className="reject-button" type="button" onClick={() => onDecision(item, "Ditolak")}>Tolak</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function ProcessFlow() {
  const nodes = [["1", "Log Masuk", "Pengguna masuk mengikut peranan."], ["2", "Pilih / Upload Borang", "Cari borang sedia ada atau upload borang baharu."], ["4", "Hantar Untuk Semakan", "Borang dihantar kepada Ketua Unit."], ["5", "Semakan Ketua Unit", "Jika tidak lengkap, borang dipulangkan."], ["6", "Kelulusan Akhir", "Pengarah atau pegawai pelulus membuat keputusan."], ["7", "Arkib & Laporan", "Rekod audit disimpan dan laporan boleh dijana."]];
  return <section className="view active"><section className="panel"><div className="panel-head"><div><h2>Carta Alir Proses Kerja Smart Borang</h2><p className="panel-note">Aliran upload, isi online, cetakan manual, semakan, kelulusan dan audit.</p></div><span className="badge">SOP Ringkas</span></div><div className="process-flow"><ProcessNode data={nodes[0]} type="start" /><ProcessNode data={nodes[1]} /><article className="process-branch"><ProcessNode data={["3A", "Isi Online", "Borang dibuka dalam portal, diisi, disimpan draf atau dihantar."]} /><ProcessNode data={["3B", "Print Manual", "Sistem sediakan borang kosong untuk dicetak."]} /></article>{nodes.slice(2, 5).map((node) => <ProcessNode key={node[0]} data={node} type={node[0] === "5" ? "decision" : ""} />)}<ProcessNode data={nodes[5]} type="end" /></div></section></section>;
}

function ProcessNode({ data, type = "" }) {
  return <article className={`process-node ${type}`}><span>{data[0]}</span><strong>{data[1]}</strong><small>{data[2]}</small></article>;
}

function AiAssistant(props) {
  return <section className="view active"><div className="ai-grid">
    <section className="panel ai-card"><div className="panel-head"><div><h2>AI Auto-Extract Borang</h2><p className="panel-note">Simulasi cadangan field selepas borang diupload.</p></div><span className="badge">Upload AI</span></div><label>Pilih jenis borang<select value={props.extractType} onChange={(event) => props.setExtractType(event.target.value)}>{Object.keys(aiFieldSuggestions).map((item) => <option key={item}>{item}</option>)}</select></label><button onClick={() => props.setExtractOutput(aiFieldSuggestions[props.extractType])}>Cadang Field</button><OutputList items={props.extractOutput} /></section>
    <section className="panel ai-card"><div className="panel-head"><div><h2>AI Semak Kelengkapan</h2><p className="panel-note">Semak borang sebelum dihantar.</p></div><span className="badge">Validasi</span></div><button onClick={props.runCheck}>Semak Borang Online</button><OutputList items={props.checkOutput} /></section>
    <section className="panel ai-card"><div className="panel-head"><div><h2>AI Ringkasan Pelulus</h2><p className="panel-note">Ringkasan pendek untuk Ketua Unit atau Pengarah.</p></div><span className="badge">Ringkasan</span></div><textarea rows="5" value={props.summaryInput} onChange={(event) => props.setSummaryInput(event.target.value)} placeholder="Masukkan catatan borang atau isu projek." /><button onClick={props.runSummary}>Jana Ringkasan</button><OutputList items={props.summaryOutput} /></section>
    <section className="panel ai-card"><div className="panel-head"><div><h2>AI Chat Pembantu Borang</h2><p className="panel-note">Tanya borang mana perlu digunakan.</p></div><span className="badge">Chat</span></div><div className="chat-window">{props.chatMessages.map((message, index) => <div className={`chat-message ${message.type}-message`} key={`${message.type}-${index}`}>{message.text}</div>)}</div><div className="chat-input-row"><input value={props.chatInput} onChange={(event) => props.setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.sendChat(); }} placeholder="Contoh: Saya mahu tuntut perjalanan rasmi" /><button onClick={props.sendChat}>Hantar</button></div></section>
  </div></section>;
}

function OutputList({ items }) {
  return <div className="ai-output">{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div>;
}

function Reports() {
  return <section className="view active"><div className="report-layout"><section className="panel"><h2>Ringkasan Bulanan</h2><div className="donut" /><div className="legend"><span><i className="green" />Diluluskan</span><span><i className="amber" />Semakan</span><span><i className="red" />Tertunggak</span></div></section><section className="panel"><h2>Jana Laporan</h2><div className="report-options"><button>Laporan Bulanan</button><button>Laporan Tahunan</button><button>Audit ISO 9001:2015</button><button>Integrasi MyProjek</button></div></section></div></section>;
}

function Access({ role }) {
  return <section className="view active"><div className="access-grid"><article className="panel"><h2>Peranan & Kebenaran</h2><div className="permissions">{permissionMatrix[role].map(([label, value]) => <div className="permission-row" key={label}><span>{label}</span><span>{value}</span></div>)}</div></article><article className="panel"><h2>Keselamatan</h2><ul className="security-list"><li>Log masuk ID pekerja dan kata laluan</li><li>Integrasi MyGovID sebagai pilihan masa depan</li><li>Rekod audit penuh untuk setiap kelulusan</li><li>Sandaran data harian di GovCloud atau MyGovCloud</li><li>Pematuhan PDPA 2010 untuk data peribadi</li></ul></article></div></section>;
}
