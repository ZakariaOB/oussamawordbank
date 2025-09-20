/** Light theme + collapsible Add panel */
// Types
/** @typedef {{id:string, word:string, pos:string, meaning:string, example?:string, source?:string, lang?:string, tags?:string[], notes?:string, difficulty?:number, createdAt:number, updatedAt:number}} Entry */

const KEY = 'ous_wordbank_v1';
const KEY_UI = 'ous_wordbank_ui_v1';
let state = loadLocal();

function loadLocal(){ try{ const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }catch{ return []; } }
function saveLocal(){ localStorage.setItem(KEY, JSON.stringify(state)); }

// Elements
const $ = (id) => document.getElementById(id);
const gridRoot = $('gridRoot');
const editorPanel = $('editorPanel');
const listPanel = $('listPanel');
const btnToggleEditor = $('btnToggleEditor');

const tbody = $('tbody');
const stats = $('stats');
const sortSel = $('sort');
const q = $('q');
const form = $('form');
const formTitle = $('formTitle');
const idInp = $('id');
const wordInp = $('word');
const posSel = $('pos');
const meaningTxt = $('meaning');
const exampleTxt = $('example');
const sourceInp = $('source');
const langInp = $('lang');
const tagsInp = $('tags');
const notesTxt = $('notes');
const diffInp = $('difficulty');
const btnReset = $('btnReset');
const btnExport = $('btnExport');
const btnClear = $('btnClear');
const fileImport = $('fileImport');

// Tabs
const tabButtons = document.querySelectorAll('.tab');
const tabEditor = document.getElementById('tab-editor');
const tabBulk = document.getElementById('tab-bulk');
const tabStudy = document.getElementById('tab-study');
const bulkArea = document.getElementById('bulkArea');
const bulkPreview = document.getElementById('bulkPreview');
const btnBulkPreview = document.getElementById('btnBulkPreview');
const btnBulkImport = document.getElementById('btnBulkImport');

// Study
const studyCard = document.getElementById('cardStudy');
const studyWord = document.getElementById('studyWord');
const studyMeta = document.getElementById('studyMeta');
const studyAnswer = document.getElementById('studyAnswer');
const studyMeaning = document.getElementById('studyMeaning');
const studyExample = document.getElementById('studyExample');
const btnReveal = document.getElementById('btnReveal');
const btnNext = document.getElementById('btnNext');

// ===== UI State (collapsible editor) =====
const uiState = loadUi();
applyUi();

btnToggleEditor.addEventListener('click', ()=>{
  uiState.editorVisible = !uiState.editorVisible;
  saveUi();
  applyUi();
});

function loadUi(){
  try{
    const raw = localStorage.getItem(KEY_UI);
    return raw ? JSON.parse(raw) : { editorVisible: false };
  }catch{ return { editorVisible: false }; }
}

function saveUi(){ localStorage.setItem(KEY_UI, JSON.stringify(uiState)); }

function applyUi(){
  const visible = !!uiState.editorVisible;
  btnToggleEditor.setAttribute('aria-expanded', String(visible));
  btnToggleEditor.textContent = visible ? 'Hide “Add” panel' : 'Show “Add” panel';
  gridRoot.classList.toggle('collapsed', !visible);
}

// ===== Bootstrap: load file then local wins =====
(async function init(){
  try{
    const res = await fetch('words.json', { cache: 'no-store' });
    const raw = res.ok ? await res.json() : null;
    const fileList = Array.isArray(raw) ? raw : (Array.isArray(raw?.entries) ? raw.entries : []);

    if(state.length === 0 && fileList.length){
      state = seedFromFile(fileList);
      saveLocal();
    } else if(fileList.length){
      state = mergeLocalWins(state, fileList);
      saveLocal();
    }
  }catch(e){
    console.warn('words.json not loaded (serve via http). Using local only.', e);
  }finally{
    render();
  }
})();

function seedFromFile(fileEntries){
  const now = Date.now();
  return fileEntries.map(f => ({
    id: crypto.randomUUID(),
    word: (f.word || '').trim(),
    pos: f.pos || 'noun',
    meaning: f.meaning || '',
    example: f.example || '',
    source: f.source || '',
    lang: f.lang || '',
    tags: Array.isArray(f.tags) ? f.tags : [],
    notes: f.notes || '',
    difficulty: clamp(parseInt(f.difficulty) || 2, 1, 5),
    createdAt: now,
    updatedAt: now
  })).sort((a,b)=>b.createdAt-a.createdAt);
}

function mergeLocalWins(localEntries, fileEntries){
  const byWord = new Map(localEntries.map(e => [(e.word||'').toLowerCase(), e]));
  const now = Date.now();
  for(const f of fileEntries){
    const k = (f.word||'').toLowerCase();
    const loc = byWord.get(k);
    if(loc){
      byWord.set(k, {
        ...loc,
        pos: loc.pos || f.pos || 'noun',
        meaning: loc.meaning || f.meaning || '',
        example: loc.example || f.example || '',
        source: loc.source || f.source || '',
        lang: loc.lang || f.lang || '',
        tags: (Array.isArray(loc.tags) && loc.tags.length) ? loc.tags : (Array.isArray(f.tags)?f.tags:[]),
        notes: loc.notes || f.notes || '',
        difficulty: clamp(parseInt(loc.difficulty)||parseInt(f.difficulty)||2,1,5),
        updatedAt: now
      });
    }else{
      byWord.set(k, {
        id: crypto.randomUUID(),
        word: (f.word||'').trim(),
        pos: f.pos || 'noun',
        meaning: f.meaning || '',
        example: f.example || '',
        source: f.source || '',
        lang: f.lang || '',
        tags: Array.isArray(f.tags)? f.tags: [],
        notes: f.notes || '',
        difficulty: clamp(parseInt(f.difficulty)||2,1,5),
        createdAt: now, updatedAt: now
      });
    }
  }
  return Array.from(byWord.values()).sort((a,b)=>b.createdAt-a.createdAt);
}

// ===== Render =====
function render(){
  const { items } = query();
  stats.textContent = `${state.length} word${state.length!==1?'s':''}`;
  if(items.length === 0){
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No words. Add some on the left ➜</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(rowHtml).join('');
}

function rowHtml(e){
  const tagHtml = (e.tags||[]).slice(0,3).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  const meta = [e.source?`<div>📚 ${escapeHtml(e.source)}</div>`:'', e.lang?`<div>🌐 ${escapeHtml(e.lang)}</div>`:'', `<div>⭐ ${e.difficulty||1}</div>`].join('');
  return `<tr>
    <td><div style="font-weight:700">${escapeHtml(e.word)}</div><div class="muted" style="font-size:12px">${escapeHtml(e.pos)}</div></td>
    <td>${escapeHtml(e.meaning)}</td>
    <td>${e.example?`<em>${escapeHtml(e.example)}</em>`:''}${e.tags && e.tags.length?`<div class="chips" style="margin-top:6px;">${tagHtml}</div>`:''}</td>
    <td>${meta}</td>
    <td>
      <button class="btn secondary" onclick='onEdit("${e.id}")'>Edit</button>
      <button class="btn danger" onclick='onDelete("${e.id}")'>Del</button>
    </td>
  </tr>`;
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Filter + sort
function query(){
  const text = q.value.trim().toLowerCase();
  const sortBy = sortSel.value;
  let items = state.slice();
  if(text){
    items = items.filter(e =>
      (e.word||'').toLowerCase().includes(text) ||
      (e.meaning||'').toLowerCase().includes(text) ||
      (e.example||'').toLowerCase().includes(text) ||
      (e.source||'').toLowerCase().includes(text) ||
      (e.tags||[]).some(t => (t||'').toLowerCase().includes(text))
    );
  }
  const dir = sortBy.startsWith('-') ? -1 : 1;
  const key = sortBy.replace('-', '');
  items.sort((a,b)=>{
    const va = a[key] ?? ''; const vb = b[key] ?? '';
    if(va<vb) return -1*dir; if(va>vb) return 1*dir; return 0;
  });
  return { items };
}

q.addEventListener('input', render);
sortSel.addEventListener('change', render);
window.addEventListener('keydown', (e)=>{ if(e.key==='/' && document.activeElement !== q){ e.preventDefault(); q.focus(); } });

// ===== CRUD =====
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const now = Date.now();
  const entry = /** @type {Entry} */ ({
    id: idInp.value || crypto.randomUUID(),
    word: wordInp.value.trim(),
    pos: posSel.value,
    meaning: meaningTxt.value.trim(),
    example: exampleTxt.value.trim(),
    source: sourceInp.value.trim(),
    lang: langInp.value.trim(),
    tags: parseTags(tagsInp.value),
    notes: notesTxt.value.trim(),
    difficulty: clamp(parseInt(diffInp.value)||1,1,5),
    createdAt: idInp.value ? (state.find(x=>x.id===idInp.value)?.createdAt||now) : now,
    updatedAt: now,
  });
  const idx = state.findIndex(x => x.id === entry.id);
  if(idx >= 0) state[idx] = entry; else state.unshift(entry);
  saveLocal(); render(); resetForm();
});

function onEdit(id){
  const e = state.find(x=>x.id===id); if(!e) return;
  idInp.value = e.id;
  wordInp.value = e.word; posSel.value = e.pos; meaningTxt.value = e.meaning;
  exampleTxt.value = e.example||''; sourceInp.value = e.source||''; langInp.value = e.lang||'';
  tagsInp.value = (e.tags||[]).join(', '); notesTxt.value = e.notes||''; diffInp.value = e.difficulty||2;
  formTitle.textContent = 'Edit word';
}
window.onEdit = onEdit;

function onDelete(id){
  if(!confirm('Delete this word?')) return;
  state = state.filter(x=>x.id!==id);
  saveLocal(); render(); resetForm();
}
window.onDelete = onDelete;

function resetForm(){ form.reset(); idInp.value=''; diffInp.value=2; formTitle.textContent='Add a word'; }
$('btnReset')?.addEventListener('click', resetForm);

function parseTags(s){ return s.split(',').map(t=>t.trim()).filter(Boolean); }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

// ===== Export / Import / Clear =====
btnExport.addEventListener('click', ()=>{
  const payload = { version:1, exportedAt:new Date().toISOString(), entries: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'words.json'; a.click();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener('change', async (ev)=>{
  const file = ev.target.files?.[0]; if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    const entries = Array.isArray(data) ? data : (Array.isArray(data.entries)? data.entries : []);
    if(entries.length===0) return alert('No entries found in file.');
    state = mergeLocalWins(state, entries);
    saveLocal(); render(); alert('Imported '+entries.length+' item(s).');
  }catch(err){ console.error(err); alert('Import failed. Ensure valid JSON.'); }
  finally { fileImport.value=''; }
});

btnClear.addEventListener('click', ()=>{
  if(!confirm('This will erase local data (not words.json). Export first to keep a backup. Continue?')) return;
  state = []; saveLocal(); render(); resetForm();
});

// ===== Bulk add (simple) =====
btnBulkPreview.addEventListener('click', ()=>{
  const lines = bulkArea.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const parsed = lines.map(parseLine).filter(Boolean);
  bulkPreview.textContent = parsed.length ? `Ready to add ${parsed.length} entrie(s).` : 'No valid lines found.';
});

btnBulkImport.addEventListener('click', ()=>{
  const lines = bulkArea.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const parsed = lines.map(parseLine).filter(Boolean);
  const now = Date.now();
  for(const p of parsed){
    const existing = state.find(e => e.word.toLowerCase() === p.word.toLowerCase());
    if(existing){
      existing.meaning = p.meaning; existing.updatedAt = now; // update meaning if word exists
    }else{
      state.unshift({ id: crypto.randomUUID(), word:p.word, pos:'noun', meaning:p.meaning, createdAt: now, updatedAt: now, difficulty:2, example:'', source:'', lang:'', tags:[], notes:'' });
    }
  }
  saveLocal(); render(); bulkArea.value = ''; bulkPreview.textContent = 'Added.';
});

function parseLine(line){
  const i = line.indexOf(' - ');
  if(i<=0) return null;
  const word = line.slice(0,i).trim();
  const meaning = line.slice(i+3).trim();
  if(!word || !meaning) return null;
  return { word, meaning };
}

// ===== Study (flashcards) =====
let studyIndex = -1;
function nextCard(){
  if(state.length===0){ studyWord.textContent='No words yet'; studyMeta.textContent='Add some first'; studyAnswer.style.display='none'; return; }
  studyIndex = (studyIndex + 1) % state.length;
  const e = state[studyIndex];
  studyWord.textContent = e.word;
  studyMeta.textContent = `${e.pos} • ${e.source||'—'} • ⭐${e.difficulty||1}`;
  studyMeaning.textContent = e.meaning;
  studyExample.textContent = e.example||'';
  studyAnswer.style.display = 'none';
}
btnNext?.addEventListener('click', nextCard);
btnReveal?.addEventListener('click', ()=>{ studyAnswer.style.display = 'block'; });
studyCard?.addEventListener('click', ()=>{ studyAnswer.style.display = studyAnswer.style.display==='none'?'block':'none'; });

// Tabs
const tabMap = { editor: tabEditor, bulk: tabBulk, study: tabStudy };
for(const b of tabButtons){
  b.addEventListener('click', ()=>{
    tabButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const which = b.dataset.tab;
    for(const k in tabMap){ tabMap[k].style.display = (k===which)? 'block':'none'; }
    if(which==='study') nextCard();
  });
}
