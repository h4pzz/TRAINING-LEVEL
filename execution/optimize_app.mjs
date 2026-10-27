import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');

let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Add debounce utility if not already present
if (!code.includes('function debounce(')) {
  const debounceCode = `/**
 * Debounce helper to prevent UI lag on fast keyboard input
 */
function debounce(fn, wait = 150) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

`;
  code = debounceCode + code;
  console.log('✅ Added debounce utility.');
}

// 2. Optimize renderCrewTable using DocumentFragment
const oldRenderLoop = `  filtered.forEach(member => {
    const tr = document.createElement('tr');`;

const newRenderLoop = `  const fragment = document.createDocumentFragment();
  filtered.forEach(member => {
    const tr = document.createElement('tr');`;

const oldAppend = `      tr.appendChild(actionTd);
    }
    
    tableBody.appendChild(tr);
  });`;

const newAppend = `      tr.appendChild(actionTd);
    }
    
    fragment.appendChild(tr);
  });
  tableBody.appendChild(fragment);`;

// Normalize line endings for replacement
const normalizeLf = (s) => s.replace(/\r\n/g, '\n');

let lfCode = normalizeLf(code);

if (lfCode.includes(normalizeLf(oldRenderLoop))) {
  lfCode = lfCode.replace(normalizeLf(oldRenderLoop), normalizeLf(newRenderLoop));
  console.log('✅ Replaced render loop with DocumentFragment start.');
} else {
  console.log('⚠️ Could not find oldRenderLoop');
}

if (lfCode.includes(normalizeLf(oldAppend))) {
  lfCode = lfCode.replace(normalizeLf(oldAppend), normalizeLf(newAppend));
  console.log('✅ Replaced row append with DocumentFragment append.');
} else {
  console.log('⚠️ Could not find oldAppend');
}

// 3. Wrap search inputs with debounce
const oldSearchListeners = `  // Search Inputs change triggers
  document.getElementById('flight-search').addEventListener('input', () => renderCrewTable('Flight'));
  document.getElementById('flight-filter-rank').addEventListener('change', () => renderCrewTable('Flight'));
  document.getElementById('flight-filter-dept').addEventListener('change', () => renderCrewTable('Flight'));
  
  document.getElementById('cabin-search').addEventListener('input', () => renderCrewTable('Cabin'));`;

const newSearchListeners = `  // Search Inputs change triggers (debounced for optimal performance)
  document.getElementById('flight-search').addEventListener('input', debounce(() => renderCrewTable('Flight'), 150));
  document.getElementById('flight-filter-rank').addEventListener('change', () => renderCrewTable('Flight'));
  document.getElementById('flight-filter-dept').addEventListener('change', () => renderCrewTable('Flight'));
  
  document.getElementById('cabin-search').addEventListener('input', debounce(() => renderCrewTable('Cabin'), 150));`;

if (lfCode.includes(normalizeLf(oldSearchListeners))) {
  lfCode = lfCode.replace(normalizeLf(oldSearchListeners), normalizeLf(newSearchListeners));
  console.log('✅ Debounced crew search inputs.');
} else {
  console.log('⚠️ Could not find oldSearchListeners');
}

// Debounce archive search
const oldArchiveSearch = `  const archiveSearchInput = document.getElementById('flight-archive-search');
  if (archiveSearchInput) {
    archiveSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      const clearBtn = document.getElementById('btn-clear-archive-search');
      if (clearBtn) clearBtn.style.display = q.trim() ? 'block' : 'none';
      renderMonthlyArchive(q);
    });
  }`;

const newArchiveSearch = `  const archiveSearchInput = document.getElementById('flight-archive-search');
  if (archiveSearchInput) {
    const debouncedArchiveRender = debounce((q) => renderMonthlyArchive(q), 150);
    archiveSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      const clearBtn = document.getElementById('btn-clear-archive-search');
      if (clearBtn) clearBtn.style.display = q.trim() ? 'block' : 'none';
      debouncedArchiveRender(q);
    });
  }`;

if (lfCode.includes(normalizeLf(oldArchiveSearch))) {
  lfCode = lfCode.replace(normalizeLf(oldArchiveSearch), normalizeLf(newArchiveSearch));
  console.log('✅ Debounced flight archive search input.');
} else {
  console.log('⚠️ Could not find oldArchiveSearch');
}

// Convert back to CRLF to preserve Windows repository convention
const finalCode = lfCode.replace(/\n/g, '\r\n');
fs.writeFileSync(appJsPath, finalCode, 'utf8');
console.log('🎉 Optimization successfully applied to js/app.js!');
