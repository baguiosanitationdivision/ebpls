// ── Status config ──────────────────────────────────────────
const STATUSES = [
  {
    value: 'For Inspection',
    label: 'For Inspection',
    cssKey: 'ForInspection',
    badgeBg: '#e8eaf6', badgeColor: '#3949ab',
    reportBg: '#e8eaf6', reportColor: '#3949ab',
    auditColor: '#3949ab', auditIcon: '🔍',
    setsTimestamp: 'reviewedAt',
  },
  {
    value: 'Disapproved - for compliance with noted sanitary violation',
    label: 'Pending – Sanitary Violation',
    cssKey: 'PendingCompliance',
    badgeBg: '#fce4ec', badgeColor: '#880e4f',
    reportBg: '#fce4ec', reportColor: '#880e4f',
    auditColor: '#880e4f', auditIcon: '⚠️',
    setsTimestamp: 'reviewedAt',
  },
  {
    value: 'Approved',
    label: 'Approved',
    cssKey: 'Approved',
    badgeBg: '#e8f5e9', badgeColor: '#2e7d32',
    reportBg: '#e8f5e9', reportColor: '#2e7d32',
    auditColor: '#2e7d32', auditIcon: '✓',
    setsTimestamp: 'approvedAt',
  },
  {
    value: 'Disapproved',
    label: 'Disapproved',
    cssKey: 'Disapproved',
    badgeBg: '#ffebee', badgeColor: '#c62828',
    reportBg: '#ffebee', reportColor: '#c62828',
    auditColor: '#c62828', auditIcon: '✕',
    setsTimestamp: 'reviewedAt',
  },
];

function getStatusMeta(value) {
  if (!value) return null;
  return STATUSES.find(s => s.value === value) || null;
}

// ── Format timestamp ───────────────────────────────────────
function fmtTs(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Auth guard ─────────────────────────────────────────────
const adminToken    = sessionStorage.getItem('admin_token');
const adminFullName = sessionStorage.getItem('admin_fullname') || 'Admin';
const adminUsername = sessionStorage.getItem('admin_username');

if (!adminToken) window.location.href = 'index.html';

document.getElementById('admin-name-display').textContent = adminFullName;

function logout() { sessionStorage.clear(); window.location.href = 'index.html'; }

// ── State ──────────────────────────────────────────────────
let allEntries      = [];
let filteredEntries = [];
let currentPage     = 1;
const PAGE_SIZE     = 20;
let editingRow      = null;
let reportType      = 'today';

// ── API call ───────────────────────────────────────────────
async function api(payload) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ ...payload, token: adminToken }),
  });
  return res.json();
}

// ── Load entries ───────────────────────────────────────────
async function loadEntries() {
  document.getElementById('table-body').innerHTML =
    '<tr class="loading-row"><td colspan="10">Loading…</td></tr>';

  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes('YOUR_')) {
    document.getElementById('table-body').innerHTML =
      '<tr class="loading-row"><td colspan="10">⚠ Apps Script URL not configured. See config.js</td></tr>';
    return;
  }

  try {
    const result = await api({ action: 'getEntries' });
    if (!result.success) {
      if (result.error === 'Unauthorized') { logout(); return; }
      throw new Error(result.error);
    }
    allEntries = result.entries || [];
    applyFilters();
    updateStats();
  } catch (err) {
    document.getElementById('table-body').innerHTML =
      `<tr class="loading-row"><td colspan="10">Error loading entries: ${err.message}</td></tr>`;
  }
}

// ── Stats ──────────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-total').textContent           = allEntries.length;
  document.getElementById('stat-inspection').textContent      = allEntries.filter(e => e['Status'] === 'For Inspection').length;
  document.getElementById('stat-approved').textContent        = allEntries.filter(e => e['Status'] === 'Approved').length;
  document.getElementById('stat-disapproved-san').textContent = allEntries.filter(e => e['Status'] === 'Disapproved - for compliance with noted sanitary violation').length;
}

// ── Filters ────────────────────────────────────────────────
function applyFilters() {
  const q       = document.getElementById('search-input').value.toLowerCase();
  const status  = document.getElementById('filter-status').value;
  const appType = document.getElementById('filter-type').value;

  filteredEntries = allEntries.filter(e => {
    const matchQ = !q || [
      e['App ID'], e['Owner Name'], e['Business Name'], e['Barangay']
    ].some(v => (v || '').toLowerCase().includes(q));
    const matchStatus = !status  || e['Status'] === status;
    const matchType   = !appType || e['Application Type'] === appType;
    return matchQ && matchStatus && matchType;
  });

  currentPage = 1;
  renderTable();
}

// ── Build compact audit trail for table ───────────────────
function buildAuditTrailCell(entry) {
  const submittedAt = entry['Timestamp'];
  const reviewedAt  = entry['Reviewed At'];
  const approvedAt  = entry['Approved At'];

  const rows = [];

  rows.push(`<div class="audit-row">
    <span class="audit-dot" style="background:#888;"></span>
    <span class="audit-label">Submitted</span>
    <span style="font-size:10.5px;">${fmtTs(submittedAt) || '—'}</span>
  </div>`);

  if (reviewedAt) {
    rows.push(`<div class="audit-row">
      <span class="audit-dot" style="background:#3949ab;"></span>
      <span class="audit-label">Reviewed</span>
      <span style="font-size:10.5px;">${fmtTs(reviewedAt)}</span>
    </div>`);
  }

  if (approvedAt) {
    rows.push(`<div class="audit-row">
      <span class="audit-dot" style="background:#2e7d32;"></span>
      <span class="audit-label">Approved</span>
      <span style="font-size:10.5px;">${fmtTs(approvedAt)}</span>
    </div>`);
  }

  return `<div class="audit-trail">${rows.join('')}</div>`;
}

// ── Render table ───────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('table-body');
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filteredEntries.slice(start, start + PAGE_SIZE);

  if (!page.length) {
    tbody.innerHTML = `
      <tr><td colspan="10">
        <div class="empty-state"><div class="empty-label">No entries found</div></div>
      </td></tr>`;
    updatePagination();
    return;
  }

  tbody.innerHTML = page.map(entry => {
    const statusVal = entry['Status'] || '';
    const meta = getStatusMeta(statusVal);
    const statusCell = meta
      ? `<span class="status-badge status-${meta.cssKey}" title="${statusVal}">${meta.label}</span>`
      : '<span style="font-size:11px;color:#bbb;">—</span>';
    return `
      <tr>
        <td class="cell-id">${entry['App ID'] || '—'}</td>
        <td class="cell-ts">${fmtTs(entry['Timestamp']) || '—'}</td>
        <td>${entry['Application Type'] || '—'}</td>
        <td class="cell-name">
          <div>${entry['Owner Name'] || '—'}</div>
          <div style="font-size:11px;color:#888;margin-top:2px;">${entry['Business Name'] || ''}</div>
        </td>
        <td>${entry['Barangay'] || '—'}</td>
        <td>${entry['Line of Business'] || '—'}</td>
        <td>${statusCell}</td>
        <td>${buildAuditTrailCell(entry)}</td>
        <td style="font-size:11px;color:#888;">${entry['Processed By'] || '—'}</td>
        <td><button class="edit-btn" onclick="openEditModal(${entry._rowIndex})">Edit</button></td>
      </tr>`;
  }).join('');

  updatePagination();
}

// ── Pagination ─────────────────────────────────────────────
function updatePagination() {
  const total = filteredEntries.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  const start = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end   = Math.min(currentPage * PAGE_SIZE, total);

  document.getElementById('pagination-info').textContent =
    total ? `Showing ${start}–${end} of ${total}` : 'No results';

  const container = document.getElementById('page-btns');
  container.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '‹';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; renderTable(); };
  container.appendChild(prevBtn);

  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === pages - 2) {
        const dot = document.createElement('button');
        dot.className = 'page-btn'; dot.textContent = '…'; dot.disabled = true;
        container.appendChild(dot);
      }
      continue;
    }
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (i === currentPage ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => { currentPage = i; renderTable(); };
    container.appendChild(btn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = '›';
  nextBtn.disabled = currentPage === pages || pages === 0;
  nextBtn.onclick = () => { currentPage++; renderTable(); };
  container.appendChild(nextBtn);
}

// ── Build audit timeline for modal ─────────────────────────
function buildAuditTimeline(entry) {
  const submittedAt = entry['Timestamp'];
  const reviewedAt  = entry['Reviewed At'];
  const approvedAt  = entry['Approved At'];
  const status      = entry['Status'] || '';

  let reviewLabel = 'Reviewed';
  if (status === 'For Inspection') reviewLabel = 'Labelled: For Inspection';
  else if (status === 'Disapproved - for compliance with noted sanitary violation') reviewLabel = 'Labelled: Disapproved (Sanitary Violation)';
  else if (status === 'Disapproved') reviewLabel = 'Labelled: Disapproved';
  else if (reviewedAt) reviewLabel = 'Reviewed / Labelled';

  const steps = [
    {
      icon: '📋',
      iconBg: '#f5f4f0',
      label: 'Application Submitted',
      time: submittedAt,
      done: !!submittedAt,
    },
    {
      icon: '🔍',
      iconBg: reviewedAt ? '#e8eaf6' : '#f5f4f0',
      label: reviewLabel,
      time: reviewedAt,
      done: !!reviewedAt,
    },
    {
      icon: '✓',
      iconBg: approvedAt ? '#e8f5e9' : '#f5f4f0',
      label: 'Approved',
      time: approvedAt,
      done: !!approvedAt,
    },
  ];

  return steps.map(step => `
    <div class="audit-step">
      <div class="audit-step-icon done" style="background:${step.iconBg}; font-size:11px;">
        ${step.icon}
      </div>
      <div class="audit-step-content">
        <div class="audit-step-label">${step.label}</div>
        ${step.done
          ? `<div class="audit-step-time">${fmtTs(step.time)}</div>`
          : `<div class="audit-step-pending">Not yet recorded</div>`
        }
      </div>
    </div>`).join('');
}

// ── Edit Modal ─────────────────────────────────────────────
function openEditModal(rowIndex) {
  const entry = allEntries.find(e => e._rowIndex === rowIndex);
  if (!entry) return;
  editingRow = rowIndex;

  const infoGrid = document.getElementById('modal-info');
  const fields = [
    ['App ID',            entry['App ID']],
    ['Application Type',  entry['Application Type']],
    ['Owner Type',        entry['Owner Type']],
    ['Owner Name',        entry['Owner Name']],
    ['Contact',           entry['Contact Number']],
    ['Business Name',     entry['Business Name']],
    ['Business Address',  entry['Business Address']],
    ['Barangay',          entry['Barangay']],
    ['Line of Business',  entry['Line of Business']],
  ];
  infoGrid.innerHTML = fields.map(([k, v]) => `
    <div class="info-item">
      <div class="info-key">${k}</div>
      <div class="info-val">${v || '—'}</div>
    </div>`).join('');

  document.getElementById('modal-audit-timeline').innerHTML = buildAuditTimeline(entry);

  document.getElementById('edit-status').value      = entry['Status'] || '';
  document.getElementById('edit-attachments').value = entry['Attachments'] || '';
  document.getElementById('edit-remarks').value     = entry['Remarks'] || '';
  document.getElementById('edit-admin-notes').value = entry['Admin Notes'] || '';

  updateStatusHint();
  document.getElementById('edit-modal').style.display = 'flex';
}

function updateStatusHint() {
  const val  = document.getElementById('edit-status').value;
  const meta = getStatusMeta(val);
  const hint = document.getElementById('status-hint');
  if (!meta) { hint.style.display = 'none'; return; }
  hint.textContent = meta.value;
  hint.style.background = meta.badgeBg;
  hint.style.color = meta.badgeColor;
  hint.style.display = val === 'Disapproved - for compliance with noted sanitary violation' ? 'inline-flex' : 'none';
}

function closeEditModal(e) {
  if (e instanceof Event && e.target !== document.getElementById('edit-modal')) return;
  document.getElementById('edit-modal').style.display = 'none';
  editingRow = null;
}

async function saveEdit() {
  const rowToSave = editingRow;
  if (rowToSave === null) return;

  const newStatus = document.getElementById('edit-status').value;
  const entry     = allEntries.find(e => e._rowIndex === rowToSave);
  const oldStatus = entry ? (entry['Status'] || '') : '';

  const now = new Date().toISOString();
  let reviewedAt = entry ? (entry['Reviewed At'] || '') : '';
  let approvedAt = entry ? (entry['Approved At'] || '') : '';

  if (newStatus && newStatus !== oldStatus) {
    if (!reviewedAt) reviewedAt = now;
    if (newStatus === 'Approved') approvedAt = now;
  } else if (newStatus && newStatus === oldStatus) {
    if (!reviewedAt && newStatus !== '' && newStatus !== 'Approved') reviewedAt = now;
    if (!reviewedAt && newStatus === 'Approved') reviewedAt = now;
    if (!approvedAt && newStatus === 'Approved') approvedAt = now;
  }

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await api({
      action: 'updateEntry',
      rowIndex: rowToSave,
      data: {
        status:      newStatus,
        attachments: document.getElementById('edit-attachments').value,
        remarks:     document.getElementById('edit-remarks').value,
        adminNotes:  document.getElementById('edit-admin-notes').value,
        reviewedAt,
        approvedAt,
      }
    });

    if (result.success) {
      showToast('Entry updated successfully', 'success');
      document.getElementById('edit-modal').style.display = 'none';
      editingRow = null;
      await loadEntries();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Network error. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save changes';
  }
}

// ── Add Modal ──────────────────────────────────────────────
function openAddModal() { document.getElementById('add-modal').style.display = 'flex'; }

function closeAddModal(e) {
  if (e instanceof Event && e.target !== document.getElementById('add-modal')) return;
  document.getElementById('add-modal').style.display = 'none';
}

function toggleAddOwner() {
  const type = document.getElementById('add-owner-type').value;
  document.getElementById('add-sole-fields').style.display = type === 'sole' ? '' : 'none';
  document.getElementById('add-corp-field').style.display  = type === 'corp' ? '' : 'none';
}

async function saveAdd() {
  const ownerType = document.getElementById('add-owner-type').value;
  const ownerName = ownerType === 'sole'
    ? document.getElementById('add-owner-name').value.trim()
    : document.getElementById('add-corp-name').value.trim();

  const data = {
    applicationType: document.getElementById('add-app-type').value,
    ownerType:       ownerType === 'sole' ? 'Single Proprietor' : 'Corporation / Partnership',
    ownerName,
    contactNumber:   document.getElementById('add-contact').value.trim(),
    businessName:    document.getElementById('add-business-name').value.trim(),
    businessAddress: document.getElementById('add-address').value.trim(),
    barangay:        document.getElementById('add-barangay').value.trim(),
    lineOfBusiness:  document.getElementById('add-lob').value,
  };

  const btn = document.getElementById('add-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await api({ action: 'addEntry', data });
    if (result.success) {
      showToast('Entry added! Ref: ' + result.id, 'success');
      document.getElementById('add-modal').style.display = 'none';
      ['add-owner-name','add-corp-name','add-contact','add-business-name',
       'add-address','add-barangay','add-attachments','add-remarks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      await loadEntries();
    } else {
      showToast('Error: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Network error. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add entry';
  }
}

// ── Report Modal ───────────────────────────────────────────
function openReportModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('report-date-from').value = today;
  document.getElementById('report-date-to').value   = today;
  document.getElementById('report-modal').style.display = 'flex';
}

function closeReportModal(e) {
  if (e instanceof Event && e.target !== document.getElementById('report-modal')) return;
  document.getElementById('report-modal').style.display = 'none';
}

function selectReportType(btn, type) {
  reportType = type;
  document.querySelectorAll('.report-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const dateSection = document.getElementById('report-date-section');
  const note        = document.getElementById('report-preview-note');

  if (type === 'today') {
    dateSection.style.display = 'none';
    note.textContent = "Generates today's report — statistics summary followed by applicants grouped by status, with full audit trail per entry.";
  } else if (type === 'range') {
    dateSection.style.display = '';
    note.textContent = "Generates a report for entries submitted within the selected date range, with audit trail per entry.";
  } else {
    dateSection.style.display = 'none';
    note.textContent = "Generates a complete report of all applications on record, grouped by status, with audit trail per entry.";
  }
}

// ── Report Generation ──────────────────────────────────────
function parseEntryDate(entry) {
  const ts = entry['Timestamp'] || '';
  const d = new Date(ts);
  if (!isNaN(d)) return d;
  return null;
}

function toDateStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`;
}

function buildReportAuditTrail(entry) {
  const submittedAt = entry['Timestamp'];
  const reviewedAt  = entry['Reviewed At'];
  const approvedAt  = entry['Approved At'];
  const processedBy = entry['Processed By'];

  function fmt(ts) {
    if (!ts && ts !== 0) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function hasTime(ts) {
    if (!ts || ts === '' || ts === 0) return false;
    const d = new Date(ts);
    return !isNaN(d.getTime());
  }

  const steps = [
    { label: 'Submitted',           time: submittedAt, color: '#555',    dot: '#aaa' },
    { label: 'Reviewed / Labelled', time: reviewedAt,  color: '#3949ab', dot: '#3949ab' },
    { label: 'Approved',            time: approvedAt,  color: '#2e7d32', dot: '#2e7d32' },
  ];

  const rendered = steps.map(s => {
    if (!hasTime(s.time)) return '';
    return `<span style="display:inline-flex; align-items:center; gap:5px; margin-right:14px; font-size:10.5px; color:${s.color};">
      <span style="width:5px;height:5px;border-radius:50%;background:${s.dot};display:inline-block;flex-shrink:0;"></span>
      <strong style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.05em;margin-right:3px;">${s.label}</strong>
      ${fmt(s.time)}
    </span>`;
  }).filter(Boolean).join('');

  const processedStr = processedBy
    ? `<span style="font-size:10px;color:#aaa;margin-left:4px;">· Processed by ${processedBy}</span>`
    : '';

  if (!rendered) return '';
  return `<div style="margin-top:5px; padding-top:5px; border-top:0.5px solid #eee; display:flex; flex-wrap:wrap; align-items:center; gap:4px;">
    ${rendered}${processedStr}
  </div>`;
}

function generateReport() {
  let entries = [...allEntries];
  let reportTitle  = '';
  let reportPeriod = '';

  const now      = new Date();
  const todayStr = toDateStr(now);

  if (reportType === 'today') {
    entries = entries.filter(e => {
      const d = parseEntryDate(e);
      return d && toDateStr(d) === todayStr;
    });
    reportTitle  = "Daily Applications Report";
    reportPeriod = fmtDate(todayStr);

  } else if (reportType === 'range') {
    const fromVal = document.getElementById('report-date-from').value;
    const toVal   = document.getElementById('report-date-to').value;
    if (!fromVal || !toVal) { showToast('Please select both dates.', 'error'); return; }
    if (fromVal > toVal)    { showToast('"From" date must be before "To" date.', 'error'); return; }
    entries = entries.filter(e => {
      const d = parseEntryDate(e);
      if (!d) return false;
      const ds = toDateStr(d);
      return ds >= fromVal && ds <= toVal;
    });
    reportTitle  = "Applications Report";
    reportPeriod = fromVal === toVal ? fmtDate(fromVal) : `${fmtDate(fromVal)} — ${fmtDate(toVal)}`;

  } else {
    reportTitle  = "Full Applications Report";
    reportPeriod = "All records on file";
  }

  if (!entries.length) {
    showToast('No entries found for the selected period.', 'error');
    return;
  }

  const total  = entries.length;
  const byType = {};
  entries.forEach(e => {
    const t = e['Application Type'] || 'Unknown';
    byType[t] = (byType[t] || 0) + 1;
  });

  const forInspectionCount  = entries.filter(e => (e['Status'] || '') === 'For Inspection').length;
  const approvedCount       = entries.filter(e => (e['Status'] || '') === 'Approved').length;
  const disapprovedSanCount = entries.filter(e => (e['Status'] || '') === 'Disapproved - for compliance with noted sanitary violation').length;

  const statCards = [
    ['Total',                            total,               '#1a1a1a'],
    ['For Inspection',                   forInspectionCount,  '#3949ab'],
    ['Approved',                         approvedCount,       '#2e7d32'],
    ['Disapproved – Sanitary Violation', disapprovedSanCount, '#880e4f'],
  ].map(([label, val, color]) => `
    <div style="border:0.5px solid #e0ddd6; border-radius:9px; padding:12px 14px; background:#fafaf8;">
      <div style="font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#999; margin-bottom:5px;">${label}</div>
      <div style="font-size:22px; font-weight:600; color:${color}; letter-spacing:-0.02em;">${val}</div>
    </div>`).join('');

  const noStatusEntries = entries.filter(e => !e['Status'] || e['Status'] === '');
  let applicantSections = '';

  if (noStatusEntries.length) {
    const rows = noStatusEntries.map((e, i) => `
      <tr style="border-bottom: 0.5px solid #eee;">
        <td style="padding:8px 10px; font-size:11px; color:#888; font-family:monospace; vertical-align:top;">${i + 1}</td>
        <td style="padding:8px 10px; font-size:11.5px; font-family:monospace; color:#555; vertical-align:top; white-space:nowrap;">${e['App ID'] || '—'}</td>
        <td style="padding:8px 10px; font-size:12px; font-weight:500; vertical-align:top;">
          ${e['Owner Name'] || '—'}
          <div style="font-size:11px; color:#777; font-weight:400; margin-top:1px;">${e['Business Name'] || ''}</div>
        </td>
        <td style="padding:8px 10px; font-size:11.5px; color:#555; vertical-align:top;">${e['Application Type'] || '—'}</td>
        <td style="padding:8px 10px; font-size:11.5px; color:#555; vertical-align:top;">${e['Barangay'] || '—'}</td>
        <td style="padding:8px 10px; vertical-align:top;">
          <div style="font-size:10.5px; color:#555; white-space:nowrap;">${fmtTs(e['Timestamp']) || '—'}</div>
          ${buildReportAuditTrail(e)}
        </td>
      </tr>`).join('');

    applicantSections += buildStatusSection('Pending Review', '#f5f4f0', '#888', noStatusEntries.length, rows);
  }

  STATUSES.forEach(({ value: status, label, reportBg, reportColor }) => {
    const group = entries.filter(e => (e['Status'] || '') === status);
    if (!group.length) return;

    const rows = group.map((e, i) => `
      <tr style="border-bottom: 0.5px solid #eee;">
        <td style="padding:8px 10px; font-size:11px; color:#888; font-family:monospace; vertical-align:top;">${i + 1}</td>
        <td style="padding:8px 10px; font-size:11.5px; font-family:monospace; color:#555; vertical-align:top; white-space:nowrap;">${e['App ID'] || '—'}</td>
        <td style="padding:8px 10px; font-size:12px; font-weight:500; vertical-align:top;">
          ${e['Owner Name'] || '—'}
          <div style="font-size:11px; color:#777; font-weight:400; margin-top:1px;">${e['Business Name'] || ''}</div>
        </td>
        <td style="padding:8px 10px; font-size:11.5px; color:#555; vertical-align:top;">${e['Application Type'] || '—'}</td>
        <td style="padding:8px 10px; font-size:11.5px; color:#555; vertical-align:top;">${e['Barangay'] || '—'}</td>
        <td style="padding:8px 10px; vertical-align:top;">
          <div style="font-size:10.5px; color:#555; white-space:nowrap;">${fmtTs(e['Timestamp']) || '—'}</div>
          ${buildReportAuditTrail(e)}
        </td>
      </tr>`).join('');

    applicantSections += buildStatusSection(status, reportBg, reportColor, group.length, rows);
  });

  const typeRows = Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([t, c]) => `
    <tr>
      <td style="padding:6px 12px; font-size:12px;">${t}</td>
      <td style="padding:6px 12px; font-size:12px; font-weight:600; text-align:right;">${c}</td>
      <td style="padding:6px 12px; font-size:11px; color:#888; text-align:right;">${Math.round(c/total*100)}%</td>
    </tr>`).join('');

  const generatedAt = now.toLocaleString('en-PH', {
    year:'numeric', month:'long', day:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} — eBPLS BHD</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'DM Sans',sans-serif; background:#fff; color:#1a1a1a; padding:40px; max-width:1040px; margin:0 auto; }
    @media print {
      body { padding:20px; }
      .no-print { display:none !important; }
      @page { margin:1.5cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:24px;">
    <button onclick="window.print()" style="padding:8px 20px; border-radius:7px; border:none; background:#1a1a1a; color:#fff; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer;">🖨 Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:8px 16px; border-radius:7px; border:0.5px solid #d4d1c8; background:#fff; color:#555; font-family:'DM Sans',sans-serif; font-size:13px; cursor:pointer;">Close</button>
  </div>

  <div style="border-bottom:1.5px solid #1a1a1a; padding-bottom:16px; margin-bottom:24px;">
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div style="font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; color:#888; margin-bottom:4px;">Environmental and Health Sanitation Division</div>
        <div style="font-size:22px; font-weight:600; letter-spacing:-0.02em;">${reportTitle}</div>
        <div style="font-size:13px; color:#555; margin-top:4px;">${reportPeriod}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px; color:#aaa; text-transform:uppercase; letter-spacing:0.07em;">Generated</div>
        <div style="font-size:12px; color:#555; margin-top:2px;">${generatedAt}</div>
        <div style="font-size:11px; color:#aaa; margin-top:2px;">By ${adminFullName}</div>
      </div>
    </div>
  </div>

  <div style="margin-bottom:28px;">
    <div style="font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:12px;">Summary</div>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px;">${statCards}</div>
  </div>

  <div style="margin-bottom:32px;">
    <div style="font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:12px;">By Application Type</div>
    <table style="width:280px; border-collapse:collapse; border:0.5px solid #e0ddd6; border-radius:8px; overflow:hidden; font-family:'DM Sans',sans-serif;">
      <thead>
        <tr style="background:#f5f4f0; border-bottom:0.5px solid #e0ddd6;">
          <th style="padding:7px 12px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">Type</th>
          <th style="padding:7px 12px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:right; font-weight:500;">Count</th>
          <th style="padding:7px 12px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:right; font-weight:500;">%</th>
        </tr>
      </thead>
      <tbody>${typeRows}</tbody>
    </table>
  </div>

  <div style="margin-bottom:24px; padding:10px 14px; background:#f9f9f7; border:0.5px solid #e8e6e0; border-radius:8px; display:flex; align-items:center; gap:20px;">
    <span style="font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#aaa; font-weight:500;">Audit Trail Legend</span>
    <span style="font-size:10.5px; color:#555; display:flex; align-items:center; gap:5px;">
      <span style="width:5px;height:5px;border-radius:50%;background:#aaa;display:inline-block;"></span> Submitted
    </span>
    <span style="font-size:10.5px; color:#3949ab; display:flex; align-items:center; gap:5px;">
      <span style="width:5px;height:5px;border-radius:50%;background:#3949ab;display:inline-block;"></span> Reviewed / Labelled
    </span>
    <span style="font-size:10.5px; color:#2e7d32; display:flex; align-items:center; gap:5px;">
      <span style="width:5px;height:5px;border-radius:50%;background:#2e7d32;display:inline-block;"></span> Approved
    </span>
  </div>

  <div>
    <div style="font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.08em; color:#888; margin-bottom:16px;">Applicants by Status</div>
    ${applicantSections}
  </div>

  <div style="margin-top:40px; padding-top:14px; border-top:0.5px solid #e0ddd6; display:flex; justify-content:space-between; font-size:10.5px; color:#aaa;">
    <span>eBPLS BHD Clearance System</span>
    <span>Generated ${generatedAt}</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked. Please allow popups for this site.', 'error'); return; }
  win.document.write(html);
  win.document.close();
  document.getElementById('report-modal').style.display = 'none';
}

// Helper: build a status section block for the report
function buildStatusSection(status, bg, color, count, rows) {
  return `
    <div style="margin-bottom:28px; break-inside:avoid;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        <span style="display:inline-block; padding:4px 14px; border-radius:20px; font-size:12px; font-weight:600; letter-spacing:0.04em; background:${bg}; color:${color};">${status}</span>
        <span style="font-size:12px; color:#888;">${count} application${count !== 1 ? 's' : ''}</span>
      </div>
      <table style="width:100%; border-collapse:collapse; border:0.5px solid #e0ddd6; border-radius:8px; overflow:hidden; font-family:'DM Sans',sans-serif;">
        <thead>
          <tr style="background:#f5f4f0; border-bottom:0.5px solid #e0ddd6;">
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500; width:30px;">#</th>
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">App ID</th>
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">Owner / Business</th>
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">Type</th>
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">Barangay</th>
            <th style="padding:8px 10px; font-size:9.5px; text-transform:uppercase; letter-spacing:0.07em; color:#888; text-align:left; font-weight:500;">Timestamps / Audit Trail</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast toast-' + type;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 4000);
}

// ── Change Password ────────────────────────────────────────
function openChangePasswordModal() {
  document.getElementById('cpw-username-label').textContent = adminFullName + ' (' + adminUsername + ')';
  document.getElementById('cpw-current').value  = '';
  document.getElementById('cpw-new').value      = '';
  document.getElementById('cpw-confirm').value  = '';
  document.getElementById('cpw-error').textContent = '';
  checkPwStrength('');
  document.getElementById('change-pw-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('cpw-current').focus(), 100);
}

function closeChangePasswordModal(e) {
  if (e instanceof Event && e.target !== document.getElementById('change-pw-modal')) return;
  document.getElementById('change-pw-modal').style.display = 'none';
}

function togglePwVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

function checkPwStrength(pw) {
  const bars  = [1,2,3,4].map(i => document.getElementById('cpw-bar-' + i));
  const label = document.getElementById('cpw-strength-label');
  let score = 0;
  if (pw.length >= 8)              score++;
  if (/[A-Z]/.test(pw))            score++;
  if (/[0-9]/.test(pw))            score++;
  if (/[^A-Za-z0-9]/.test(pw))     score++;

  const colors = ['#e53935','#ef6c00','#f9a825','#2e7d32'];
  const labels = ['Weak','Fair','Good','Strong'];
  bars.forEach((b, i) => {
    b.style.background = i < score ? colors[score - 1] : 'var(--border)';
  });
  label.textContent = pw.length ? labels[score - 1] || '' : '';
  label.style.color = pw.length ? colors[score - 1] : 'var(--text-faint)';
}

async function saveChangePassword() {
  const current  = document.getElementById('cpw-current').value;
  const newPw    = document.getElementById('cpw-new').value;
  const confirm  = document.getElementById('cpw-confirm').value;
  const errEl    = document.getElementById('cpw-error');
  errEl.textContent = '';

  if (!current || !newPw || !confirm) {
    errEl.textContent = 'Please fill in all fields.'; return;
  }
  if (newPw.length < 8) {
    errEl.textContent = 'New password must be at least 8 characters.'; return;
  }
  if (newPw !== confirm) {
    errEl.textContent = 'New passwords do not match.'; return;
  }
  if (current === newPw) {
    errEl.textContent = 'New password must differ from current password.'; return;
  }

  const btn = document.getElementById('cpw-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await api({
      action: 'changePassword',
      currentPassword: current,
      newPassword: newPw,
    });

    if (result.success) {
      document.getElementById('change-pw-modal').style.display = 'none';
      showToast('Password updated successfully. Please log in again.', 'success');
      setTimeout(() => { sessionStorage.clear(); window.location.href = 'index.html'; }, 2200);
    } else {
      errEl.textContent = result.error || 'Failed to update password.';
    }
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

// ── Init ───────────────────────────────────────────────────
loadEntries();