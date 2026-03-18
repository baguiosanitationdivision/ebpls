/* ── Barangay list ── */
const BARANGAYS = [
  "A. BONIFACIO-CAGUIOA-RIMANDO (ABCR)",
  "ABANAO-ZANDUETA-KAYONG-CHUGUM-OTEK (AZKCO)",
  "ALFONSO TABORA","AMBIONG","ANDRES BONIFACIO (LOWER BOKAWKAN)",
  "ASIN ROAD","ATOK TRAIL","AURORA HILL PROPER","BAKAKENG CENTRAL",
  "BAKAKENG NORTE/SUR","BAL-MARCOVILLE (MARCOVILLE)","BALSIGAN",
  "BAYAN PARK EAST","BAYAN PARK VILLAGE","BGH COMPOUND","BROOKSIDE",
  "BROOKSPOINT","CABINET HIIL T. CAMP","CAMDAS SUBDIVISION","CAMP 7",
  "CAMP 8","CAMP ALLEN","CAMPO FILIPINO","CITY CAMP CENTRAL",
  "CITY CAMP PROPER","COUNTRY CLUB VILLAGE","CRESENCIA VILLAGE",
  "DIZON SUBDIVISION","DOMINICAN-MIRADOR","DONTOGAN","DPS COMPOUND",
  "EAST MODERN SITE","EAST QUIRINO HILL","ENGINEERS HILL","FAIRVIEW",
  "FERDINAND","FORT DEL PILAR","GABRIELA SILANG","GEFA (LOWER Q.M).",
  "GIBRALTAR","GREEN WATER","GUISAD CENTRAL","GUISAD SURONG",
  "HAPPY HOLLOW","HAPPY HOMES-LUCBAN","HARRISON-CARRANTES","HILLSIDE",
  "HOLYGHOST EXTENSION","HOLYGHOST PROPER","HONEYMOON-HOLYGHOST",
  "IMELDA MARCOS","IMELDA VILLAGE","IRISAN","KABAYANIHAN","KAGITINGAN",
  "KAYANG EXTENSION","KAYANG HILLTOP","KIAS","LEGARDA-BURNHAM-KISAD",
  "LOAKAN APUGAN","LOAKAN LIWANAG","LOAKAN PROPER","LOPEZ JAENA",
  "LOURDES SUBDIVISION EXTENSION","LOURDES SUBDIVISION PROPER",
  "LOWER DAGSIAN","LOWER GENERAL LUNA","LOWER LOURDES SUBDIVISION",
  "LOWER MAGSAYSAY","LOWER QUIRINO HILL","LOWER ROCK QUARRY","LUALHATI",
  "LUCNAB","MAGSAYSAY PRIVATE RD.","MALCOLM SQUARE","MANUEL ROXAS",
  "MIDDLE QUEZON HILL","MIDDLE QUIRINO HILL","MIDDLE ROCK QUARRY",
  "MILITARY CUT-OFF","MINES VIEW PARK","MRR-QUEEN OF PEACE","NEW LUCBAN",
  "NORTH CENTRAL AURORA HILL","NORTH SANITARY CAMP","OUTLOOK DRIVE",
  "PACDAL","PADRE BURGOS","PADRE ZAMORA","PALMA-URBANO","PHIL-AM",
  "PINGET","PINSAO PILOT PROJECT","PINSAO PROPER","POLIWES","PUCSUSAN",
  "QUEZON HILL PROPER","QUIRINO-MAGSAYSAY (UPPER QM)","RIZAL MONUMENT",
  "SAINT JOSEPH VILLAGE","SALUD MITRA","SAN ANTONIO VILLAGE",
  "SAN LUIS VILLAGE","SAN ROQUE VILLAGE","SAN VICENTE","SANTA ESCOLASTICA",
  "SANTO ROSARIO","SANTO TOMAS PROPER","SANTO TOMAS SCHOOL AREA",
  "SCOUT BARRIO","SESSION ROAD",
  "SLAUGHTER HOUSE AREA (SANTO NIÑO SLAUGTHER)","SLU-SVP",
  "SOUTH CENTRAL AURORA HILL","SOUTH DRIVE","SOUTH SANITARY CAMP",
  "TEODORA ALONZO","TRANCOVILLE","UPPER DAGSIAN","UPPER GENERAL LUNA",
  "UPPER MAGSAYSAY","UPPER MARKET SUBDIVISION","UPPER QUEZON HILL",
  "UPPER ROCK QUARRY","VICTORIA VILLAGE","WEST BAYAN PARK",
  "WEST MODERNSITE","WEST QUIRINO HILL"
];

/* ── Toast ── */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast toast-' + type;
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 4000);
}

/* ── Barangay autocomplete ── */
function initBarangayAutocomplete() {
  const input    = document.getElementById('barangay-input');
  const dropdown = document.getElementById('barangay-dropdown');
  let activeIndex = -1;

  function showSuggestions(query) {
    const q = query.trim().toUpperCase();
    dropdown.innerHTML = '';
    activeIndex = -1;
    if (!q) { dropdown.hidden = true; return; }
    const matches = BARANGAYS.filter(b => b.includes(q));
    if (!matches.length) { dropdown.hidden = true; return; }
    matches.forEach(brgy => {
      const li = document.createElement('li');
      const idx = brgy.toUpperCase().indexOf(q);
      li.innerHTML = brgy.slice(0, idx) + '<mark>' + brgy.slice(idx, idx + q.length) + '</mark>' + brgy.slice(idx + q.length);
      li.addEventListener('mousedown', e => { e.preventDefault(); selectBarangay(brgy); });
      dropdown.appendChild(li);
    });
    dropdown.hidden = false;
  }

  function selectBarangay(value) {
    input.value = value;
    input.style.borderColor = '';
    dropdown.hidden = true;
    activeIndex = -1;
  }

  input.addEventListener('input', () => showSuggestions(input.value));
  input.addEventListener('focus', () => showSuggestions(input.value));
  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('li');
    if (!items.length || dropdown.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, -1); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectBarangay(items[activeIndex].textContent); return; }
    else if (e.key === 'Escape') { dropdown.hidden = true; return; }
    items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
    if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.hidden = true;
  });
}

/* ── Owner type toggle ── */
function setOwnerType(type) {
  document.getElementById('owner-sole').style.display = type === 'sole' ? '' : 'none';
  document.getElementById('owner-corp').style.display = type === 'corp' ? '' : 'none';
}

/* ── Clear form ── */
function clearForm() {
  document.querySelectorAll('input[type="text"], input[type="tel"]').forEach(i => i.value = '');
  document.getElementById('barangay-dropdown').hidden = true;

  // Reset application type to first option (Renew)
  const appTypeFirst = document.querySelector('input[name="app-type"]');
  if (appTypeFirst) appTypeFirst.checked = true;

  // Reset owner type to sole proprietor and show correct fields
  const ownerTypeFirst = document.querySelector('input[name="owner-type"][value="sole"]');
  if (ownerTypeFirst) ownerTypeFirst.checked = true;
  setOwnerType('sole');
}

/* ── Collect form data ── */
function collectFormData() {
  const appType   = document.querySelector('input[name="app-type"]:checked')?.value || '';
  const ownerTypeVal = document.querySelector('input[name="owner-type"]:checked')?.value || 'sole';
  const ownerType = ownerTypeVal === 'sole' ? 'Single Proprietor' : 'Corporation / Partnership';
  const isSole    = ownerTypeVal === 'sole';

  let ownerName = '';
  if (isSole) {
    const last   = document.getElementById('last-name').value.trim();
    const first  = document.getElementById('first-name').value.trim();
    const middle = document.getElementById('middle-name').value.trim();
    const suffix = document.getElementById('suffix').value.trim();
    ownerName = [last, first, middle, suffix].filter(Boolean).join(', ');
  } else {
    ownerName = document.getElementById('corp-name').value.trim();
  }

  return {
    applicationType: appType,
    ownerType: ownerType,
    ownerName: ownerName,
    contactNumber: document.getElementById('contact').value.trim(),
    businessName: document.getElementById('business-name').value.trim(),
    businessAddress: document.getElementById('address').value.trim(),
    barangay: document.getElementById('barangay-input').value.trim(),
    lineOfBusiness: document.getElementById('lob-select').value.trim(),
  };
}

/* ── Validate ── */
function validateForm(data) {
  let valid = true;

  function mark(id, bad) {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = bad ? '#e57373' : '';
    if (bad) valid = false;
  }

  const isSole = document.getElementById('owner-sole').style.display !== 'none';
  if (isSole) {
    mark('last-name',  !document.getElementById('last-name').value.trim());
    mark('first-name', !document.getElementById('first-name').value.trim());
  } else {
    mark('corp-name', !document.getElementById('corp-name').value.trim());
  }

  mark('contact',       !data.contactNumber);
  mark('business-name', !data.businessName);
  mark('address',       !data.businessAddress);
  mark('lob-select',    !data.lineOfBusiness);

  const brgyInput = document.getElementById('barangay-input');
  const brgyValid = BARANGAYS.includes(data.barangay.toUpperCase());
  brgyInput.style.borderColor = brgyValid ? '' : '#e57373';
  if (!brgyValid) valid = false;

  return valid;
}

/* ── Submit ── */
async function submitForm() {
  const data = collectFormData();
  if (!validateForm(data)) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL.includes('YOUR_')) {
    showToast('⚠ Apps Script URL not configured. See config.js', 'error');
    return;
  }

  const btn     = document.getElementById('submit-btn');
  const txtEl   = document.getElementById('submit-text');
  const spinner = document.getElementById('submit-spinner');
  btn.disabled  = true;
  txtEl.textContent = 'Submitting…';
  spinner.hidden = false;

  try {
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'submit', data }),
    });
    const result = await res.json();

    if (result.success) {
      showToast(`✓ Application submitted! Reference: ${result.id}`, 'success');
      clearForm();
    } else {
      showToast('Submission failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    txtEl.textContent = 'Submit application';
    spinner.hidden = true;
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', initBarangayAutocomplete);
