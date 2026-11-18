const DB_NAME = 'DeliveryTeamDB';
const STORE = 'drivers';
let db, drivers = [], editingId = null, currentPhotos = [], currentTheme = 'light', currentAtt = [], currentAmount = [], currentNotes = [];

const els = {
  add: document.getElementById('btnAddDriver'),
  search: document.getElementById('searchInput'),
  status: document.getElementById('statusFilter'),
  grid: document.getElementById('driversGrid'),
  empty: document.getElementById('emptyState'),
  modal: document.getElementById('driverModal'),
  backdrop: document.getElementById('modalBackdrop'),
  close: document.getElementById('btnCloseModal'),
  cancel: document.getElementById('btnCancelModal'),
  form: document.getElementById('driverForm'),
  id: document.getElementById('driverId'),
  title: document.getElementById('modalTitle'),
  name: document.getElementById('inputFullName'),
  phone: document.getElementById('inputPhone'),
  statusIn: document.getElementById('inputStatus'),
  photos: document.getElementById('inputPhotos'),
  photoPreviews: document.getElementById('photoPreviews'),
  theme: document.getElementById('themeSelect'),
  attType: document.getElementById('attType'),
  attNote: document.getElementById('attNote'),
  btnAddAtt: document.getElementById('btnAddAtt'),
  attList: document.getElementById('attList'),
  amountDue: document.getElementById('inputAmountDue'),
  amountNote: document.getElementById('amountNote'),
  btnAddAmount: document.getElementById('btnAddAmount'),
  amountList: document.getElementById('amountList'),
  notes: document.getElementById('inputNotes'),
  btnAddNote: document.getElementById('btnAddNote'),
  notesList: document.getElementById('notesList'),
  advancedSection: document.querySelector('.advanced-section'),
  export: document.getElementById('btnExport'),
  import: document.getElementById('btnImport'),
  importFile: document.getElementById('importFile')
};

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('fullName', 'fullName', { unique: false });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('phone', 'phone', { unique: false });
      }
    };
    r.onsuccess = e => { db = e.target.result; res(); };
    r.onerror = e => rej(e.target.error);
  });
}

function store(mode) { return db.transaction([STORE], mode).objectStore(STORE); }

function loadDrivers() {
  return new Promise((res, rej) => {
    const req = store('readonly').getAll();
    req.onsuccess = () => {
      drivers = req.result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      res();
    };
    req.onerror = e => rej(e.target.error);
  });
}

function addDriver(o) {
  return new Promise((res, rej) => {
    const req = store('readwrite').add(o);
    req.onsuccess = () => res(req.result);
    req.onerror = e => rej(e.target.error);
  });
}

function updDriver(o) {
  return new Promise((res, rej) => {
    const req = store('readwrite').put(o);
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  });
}

function delDriver(id) {
  return new Promise((res, rej) => {
    const req = store('readwrite').delete(id);
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  });
}

function clearStore() {
  return new Promise((res, rej) => {
    const req = store('readwrite').clear();
    req.onsuccess = () => res();
    req.onerror = e => rej(e.target.error);
  });
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render() {
  const q = els.search.value.toLowerCase();
  const st = els.status.value;
  const list = drivers.filter(d =>
    ((d.fullName || '').toLowerCase().includes(q) || (d.phone || '').includes(q))
  ).filter(d => st === 'all' || d.status === st);

  els.grid.innerHTML = '';
  if (list.length === 0) {
    els.empty.classList.remove('hidden');
  } else {
    els.empty.classList.add('hidden');
    list.forEach(d => {
      const photos = (d.photos || []).map(p => `<img src="${esc(p.url)}" class="card-photo">`).join('');
      const badge = d.status === 'active' ? 'status-active' : 'status-inactive';
      const txt = d.status === 'active' ? 'نشط' : 'غير نشط';

      const attLabel = { absent: 'غياب', late: 'تأخير', other: 'أخرى' };
      let attHtml = '';
      if (d.attendance && d.attendance.length) {
        const last = d.attendance[d.attendance.length - 1];
        const cls = 'flag-' + last.type;
        attHtml = '<div class="flag-badge ' + cls + '">🚩 ' + (attLabel[last.type] || last.type) + (last.note ? '– ' + esc(last.note) : '') + (last.date ? ' (' + last.date + ')' : '') + '</div>';
      }

      let amountHtml = '';
      if (d.amountDue && d.amountDue.length) {
        const last = d.amountDue[d.amountDue.length - 1];
        amountHtml = '<div class="ded-total" style="color:var(--t-primary);">المبلغ: ' + last.amount + (last.note ? '– ' + esc(last.note) : '') + (last.date ? ' (' + last.date + ')' : '') + '</div>';
      }

      let notesHtml = '';
      if (d.notes && d.notes.length) {
        const last = d.notes[d.notes.length - 1];
        notesHtml = '<div class="ded-total" style="color:var(--t-muted);">ملاحظة: ' + esc(last.text) + (last.date ? ' (' + last.date + ')' : '') + '</div>';
      }

      const html = `
        <div class="driver-card" data-id="${d.id}">
          <div class="card-photos">${photos}</div>
          <div class="card-info">
            <h3>${esc(d.fullName)}</h3>
            <p class="card-phone">📞 ${esc(d.phone)}</p>
            <span class="status-badge ${badge}">${txt}</span>
            ${attHtml}
            ${amountHtml}
            ${notesHtml}
          </div>
          <div class="card-actions">
            <button class="btn btn-sm btn-primary" onclick="app.editDriver(${d.id})">تعديل</button>
            <button class="btn btn-sm btn-danger" onclick="app.del(${d.id})">حذف</button>
          </div>
        </div>`;
      els.grid.insertAdjacentHTML('beforeend', html);
    });
  }
}
function openModal(isEdit) {
  els.title.textContent = isEdit ? "تعديل بيانات السائق" : "إضافة سائق جديد";
  if (isEdit) {
    els.advancedSection.classList.remove("hidden");
  } else {
    els.advancedSection.classList.add("hidden");
  }
  els.modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  els.modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function toggleAccordion(header) {
  const content = header.nextElementSibling;
  const isActive = header.classList.contains("active");
  document.querySelectorAll(".accordion-header.active").forEach(h => {
    h.classList.remove("active");
    if (h.nextElementSibling) h.nextElementSibling.classList.remove("show");
  });
  if (!isActive) {
    header.classList.add("active");
    content.classList.add("show");
  }
}
els.close.onclick = closeModal;
els.cancel.onclick = closeModal;
els.backdrop.onclick = closeModal;
els.add.onclick = () => app.newDriver();
els.search.oninput = render;

function renderPhotos() {
  els.photoPreviews.innerHTML = "";
  currentPhotos.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "photo-preview";
    div.innerHTML = `<img src="${esc(p.url)}"><button type="button" class="rem-photo" data-i="${i}">×</button>`;
    els.photoPreviews.appendChild(div);
  });
  els.photoPreviews.querySelectorAll(".rem-photo").forEach(b => {
    b.onclick = function () {
      currentPhotos.splice(Number(this.dataset.i), 1);
      renderPhotos();
    };
  });
}
els.photos.onchange = function () {
  const files = Array.from(this.files || []);
  if (!files.length) return;
  files.forEach(f => {
    const r = new FileReader();
    r.onload = e => { currentPhotos.push({ url: e.target.result, name: f.name, type: f.type }); renderPhotos(); };
    r.readAsDataURL(f);
  });
  this.value = "";
};

// --- الحضور (غياب / تأخير / أخرى فقط) ---
els.btnAddAtt.onclick = function () {
  const now = new Date();
  currentAtt.push({
    type: els.attType.value,
    note: els.attNote.value.trim(),
    date: now.toISOString().slice(0, 10)
  });
  renderAttList();
  els.attNote.value = "";
};

function renderAttList() {
  els.attList.innerHTML = "";
  currentAtt.forEach((r, i) => {
    const lbl = r.type === 'absent' ? 'غياب' : r.type === 'late' ? 'تأخير' : 'أخرى';
    const div = document.createElement("div");
    div.className = "record-item";
    div.innerHTML =
      '<span class="record-value">' + lbl + '</span>' +
      (r.note ? '<span class="record-meta">– ' + esc(r.note) + '</span>' : '') +
      '<span class="record-meta">(' + r.date + ')</span>' +
      '<div class="record-actions">' +
      '<button class="btn btn-sm btn-secondary" onclick="editAtt(' + i + ')">تعديل</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteAtt(' + i + ')">حذف</button>' +
      "</div>";
    els.attList.appendChild(div);
  });
}

window.editAtt = function (i) {
  const r = currentAtt[i];
  els.attType.value = r.type;
  els.attNote.value = r.note || "";
  currentAtt.splice(i, 1);
  renderAttList();
};

window.deleteAtt = function (i) {
  currentAtt.splice(i, 1);
  renderAttList();
};

// --- المبلغ المطلوب عليه ---
els.btnAddAmount.onclick = function () {
  const now = new Date();
  currentAmount.push({
    amount: Number(els.amountDue.value) || 0,
    note: els.amountNote.value.trim(),
    date: now.toISOString().slice(0, 10)
  });
  renderAmountList();
  els.amountDue.value = "";
  els.amountNote.value = "";
};

function renderAmountList() {
  els.amountList.innerHTML = "";
  currentAmount.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "record-item";
    div.innerHTML =
      '<span class="record-value">' + r.amount + '</span>' +
      (r.note ? '<span class="record-meta">– ' + esc(r.note) + '</span>' : '') +
      '<span class="record-meta">(' + r.date + ')</span>' +
      '<div class="record-actions">' +
      '<button class="btn btn-sm btn-secondary" onclick="editAmount(' + i + ')">تعديل</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteAmount(' + i + ')">حذف</button>' +
      "</div>";
    els.amountList.appendChild(div);
  });
}

window.editAmount = function (i) {
  const r = currentAmount[i];
  els.amountDue.value = r.amount;
  els.amountNote.value = r.note || "";
  currentAmount.splice(i, 1);
  renderAmountList();
};

window.deleteAmount = function (i) {
  currentAmount.splice(i, 1);
  renderAmountList();
};

// --- الملاحظات ---
els.btnAddNote.onclick = function () {
  const now = new Date();
  currentNotes.push({
    text: els.notes.value.trim(),
    date: now.toISOString().slice(0, 10)
  });
  renderNotesList();
  els.notes.value = "";
};

function renderNotesList() {
  els.notesList.innerHTML = "";
  currentNotes.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "record-item";
    div.innerHTML =
      '<span class="record-value">' + esc(r.text) + '</span>' +
      '<span class="record-meta">(' + r.date + ')</span>' +
      '<div class="record-actions">' +
      '<button class="btn btn-sm btn-secondary" onclick="editNote(' + i + ')">تعديل</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteNote(' + i + ')">حذف</button>' +
      "</div>";
    els.notesList.appendChild(div);
  });
}

window.editNote = function (i) {
  const r = currentNotes[i];
  els.notes.value = r.text;
  currentNotes.splice(i, 1);
  renderNotesList();
};

window.deleteNote = function (i) {
  currentNotes.splice(i, 1);
  renderNotesList();
};

function fillForm(d) {
  els.id.value = d.id || "";
  els.name.value = d.fullName || "";
  els.phone.value = d.phone || "";
  els.statusIn.value = d.status || "active";
  currentPhotos = (d.photos || []).slice();
  renderPhotos();

  currentAtt = (d.attendance || []).slice();
  currentAmount = (d.amountDue || []).slice();
  currentNotes = (d.notes || []).slice();
  renderAttList();
  renderAmountList();
  renderNotesList();
}

els.form.onsubmit = function (e) {
  e.preventDefault();
  const id = Number(els.id.value) || null;
  const d = {
    fullName: els.name.value.trim(),
    phone: els.phone.value.trim(),
    status: els.statusIn.value,
    photos: currentPhotos,
    attendance: currentAtt,
    amountDue: currentAmount,
    notes: currentNotes,
    updatedAt: new Date().toISOString()
  };

  if (id) {
    d.id = id;
    d.createdAt = drivers.find(x => x.id === id)?.createdAt || d.updatedAt;
    updDriver(d);
  } else {
    d.createdAt = d.updatedAt;
    addDriver(d);
  }
  closeModal();
  loadDrivers().then(render);
};
window.app = {
  newDriver() {
    editingId = null;
    currentPhotos = [];
    currentAtt = [];
    currentAmount = [];
    currentNotes = [];
    els.id.value = "";
    els.name.value = "";
    els.phone.value = "";
    els.statusIn.value = "active";
    els.attType.value = "absent";
    els.attNote.value = "";
    els.amountDue.value = "";
    els.amountNote.value = "";
    els.notes.value = "";
    renderPhotos();
    renderAttList();
    renderAmountList();
    renderNotesList();
    openModal(false);
  },
  editDriver(id) {
    editingId = id;
    const d = drivers.find(x => x.id === id);
    if (!d) return;
    fillForm(d);
    openModal(true);
  },
  del(id) {
    document.getElementById("deleteDriverId").value = id;
    openDelete(true);
  }
};

const delModal = document.getElementById("deleteModal");
const delClose = document.getElementById("btnCloseDelete");
const delCancel = document.getElementById("btnCancelDelete");
const delConfirm = document.getElementById("btnConfirmDelete");

function openDelete(show) { delModal.classList.toggle("hidden", !show); }
function closeDelete() { openDelete(false); }
delClose.onclick = closeDelete;
delCancel.onclick = closeDelete;
delConfirm.onclick = function () {
  const id = Number(document.getElementById("deleteDriverId").value);
  closeDelete();
  delDriver(id).then(() => loadDrivers().then(render));
};

els.export.onclick = function () {
  const blob = new Blob([JSON.stringify(drivers, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `نسخة احتياطية - سائقين ${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
els.import.onclick = function () { els.importFile.click(); };
els.importFile.onchange = function () {
  const f = this.files && this.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const arr = JSON.parse(e.target.result);
      if (!Array.isArray(arr)) throw new Error("تنسيق الملف غير صالح");
      clearStore().then(() => Promise.all(arr.map(d => addDriver(d))).then(() => loadDrivers().then(render)));
    } catch (err) {
      alert("فشل الاستعادة: " + err.message);
    }
  };
  r.readAsText(f);
  this.value = "";
};

function applyTheme() {
  document.body.className = 'theme-' + currentTheme;
  if (els.theme) els.theme.value = currentTheme;
}
els.theme.onchange = function () {
  currentTheme = this.value;
  localStorage.setItem('deliveryTheme', currentTheme);
  applyTheme();
};
applyTheme();

openDb().then(loadDrivers).then(render).catch(err => alert("خطأ في فتح قاعدة البيانات: " + err.message));