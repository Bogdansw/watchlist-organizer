const themeBtn = document.getElementById('theme-toggle-btn');
const sunIcon  = document.querySelector('.theme-toggle__icon--sun');
const moonIcon = document.querySelector('.theme-toggle__icon--moon');

function applyTheme(dark) {
  document.body.classList.toggle('dark-mode', dark);
  themeBtn.setAttribute('aria-pressed', String(dark));
  if (dark) {
    sunIcon.hidden  = true;
    moonIcon.hidden = false;
  } else {
    sunIcon.hidden  = false;
    moonIcon.hidden = true;
  }
}

const savedDark = localStorage.getItem('darkMode') === 'true';
applyTheme(savedDark);

themeBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyTheme(!isDark);
  localStorage.setItem('darkMode', String(!isDark));
});

const categoryBtns   = document.querySelectorAll('.category-btn');
const currentCatEl   = document.getElementById('current-category');
const itemsCountEl   = document.getElementById('items-count');
const itemsGrid      = document.getElementById('items-grid');

const CATEGORY_LABELS = {
  watching:   'Urmăresc',
  planned:    'Planificat',
  rewatching: 'Re-vizionare',
  paused:     'Întrerupt',
  dropped:    'Abandonat',
  favorites:  'Favorite',
};

let currentCategory = 'watching';
let items = JSON.parse(localStorage.getItem('items') || '[]');

function saveItems() {
  localStorage.setItem('items', JSON.stringify(items));
}

function updateCounts() {
  categoryBtns.forEach(btn => {
    const cat   = btn.dataset.category;
    const count = items.filter(i => i.category === cat).length;
    const el    = document.querySelector(`[data-count-for="${cat}"]`);
    if (el) el.textContent = count;
  });
}

function renderGrid() {
  const filtered = items.filter(i => i.category === currentCategory);
  itemsCountEl.textContent = `${filtered.length} elemente`;
  itemsGrid.innerHTML = '';

  if (filtered.length === 0) {
    itemsGrid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">Niciun element în această categorie.</p>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const globalIdx = items.indexOf(item);
    const card = document.createElement('div');
    card.className = 'item-card';
    card.setAttribute('role', 'listitem');
    card.style.cssText = 'padding:14px;display:flex;flex-direction:column;gap:8px;';

    const stars = item.rating ? '★'.repeat(item.rating) + '☆'.repeat(10 - item.rating) : '';

    card.innerHTML = `
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:16px;">` : ''}
      <strong style="font-size:14px;line-height:1.3">${item.title}</strong>
      <span style="font-size:11px;color:var(--muted);text-transform:uppercase">${item.type === 'movie' ? 'Film' : 'Serial'}</span>
      ${item.progress ? `<span style="font-size:12px;color:var(--muted)">Progres: ${item.progress}</span>` : ''}
      ${stars ? `<span style="font-size:11px;color:var(--accent);letter-spacing:1px" title="${item.rating}/10">${stars}</span>` : ''}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="editItem(${globalIdx})" style="flex:1;border:0;border-radius:9999px;padding:6px;cursor:pointer;background:var(--bg);color:var(--accent);box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);font-size:12px">Edit</button>
        <button onclick="deleteItem(${globalIdx})" style="flex:1;border:0;border-radius:9999px;padding:6px;cursor:pointer;background:var(--bg);color:#e57373;box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);font-size:12px">Șterge</button>
      </div>
    `;
    itemsGrid.appendChild(card);
  });
}

function switchCategory(cat) {
  currentCategory = cat;
  currentCatEl.textContent = CATEGORY_LABELS[cat];
  categoryBtns.forEach(b => b.classList.toggle('active', b.dataset.category === cat));
  renderGrid();
}

categoryBtns.forEach(btn => {
  btn.addEventListener('click', () => switchCategory(btn.dataset.category));
});

const dialog       = document.getElementById('item-dialog');
const form         = document.getElementById('item-form');
const addBtn       = document.getElementById('add-item-btn');
const cancelBtn    = document.getElementById('cancel-btn');
const modalTitle   = document.getElementById('modal-title');
const submitBtn    = document.getElementById('form-submit-btn');

let editingIndex = -1;

function openModal(item = null, idx = -1) {
  form.reset();
  editingIndex = idx;

  if (item) {
    modalTitle.textContent = 'Editează';
    submitBtn.textContent  = 'Salvează modificările';
    form.title.value       = item.title;
    form.type.value        = item.type;
    form.category.value    = item.category;
    form.progress.value    = item.progress || '';
    form['image-url'].value = item.imageUrl || '';
    form.notes.value       = item.notes || '';
    if (item.rating) {
      const radio = form.querySelector(`input[name="rating"][value="${item.rating}"]`);
      if (radio) radio.checked = true;
    }
  } else {
    modalTitle.textContent = 'Adaugă film sau serial';
    submitBtn.textContent  = 'Salvează';
    form.category.value    = currentCategory;
  }

  dialog.showModal();
}

addBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

window.editItem = function(idx) { openModal(items[idx], idx); };
window.deleteItem = function(idx) {
  items.splice(idx, 1);
  saveItems();
  updateCounts();
  renderGrid();
  showToast('Element șters.');
};

form.addEventListener('submit', e => {
  e.preventDefault();
  const ratingInput = form.querySelector('input[name="rating"]:checked');

  const entry = {
    title:    form.title.value.trim(),
    type:     form.type.value,
    category: form.category.value,
    progress: form.progress.value.trim(),
    rating:   ratingInput ? Number(ratingInput.value) : null,
    imageUrl: form['image-url'].value.trim(),
    notes:    form.notes.value.trim(),
  };

  if (editingIndex >= 0) {
    items[editingIndex] = entry;
    showToast('Modificări salvate!');
  } else {
    items.push(entry);
    showToast('Element adăugat!');
  }

  saveItems();
  updateCounts();
  if (entry.category === currentCategory) renderGrid();
  dialog.close();
});

const searchBar = document.getElementById('search-bar');
searchBar.addEventListener('input', () => {
  const q = searchBar.value.trim().toLowerCase();
  if (!q) { renderGrid(); return; }

  const filtered = items.filter(i =>
    i.category === currentCategory && i.title.toLowerCase().includes(q)
  );
  itemsCountEl.textContent = `${filtered.length} elemente`;
  itemsGrid.innerHTML = '';
  filtered.forEach(item => {
    const globalIdx = items.indexOf(item);
    const card = document.createElement('div');
    card.className = 'item-card';
    card.setAttribute('role', 'listitem');
    card.style.cssText = 'padding:14px;display:flex;flex-direction:column;gap:8px;';
    const stars = item.rating ? '★'.repeat(item.rating) + '☆'.repeat(10 - item.rating) : '';
    card.innerHTML = `
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:16px;">` : ''}
      <strong style="font-size:14px;line-height:1.3">${item.title}</strong>
      <span style="font-size:11px;color:var(--muted);text-transform:uppercase">${item.type === 'movie' ? 'Film' : 'Serial'}</span>
      ${item.progress ? `<span style="font-size:12px;color:var(--muted)">Progres: ${item.progress}</span>` : ''}
      ${stars ? `<span style="font-size:11px;color:var(--accent);letter-spacing:1px">${stars}</span>` : ''}
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="editItem(${globalIdx})" style="flex:1;border:0;border-radius:9999px;padding:6px;cursor:pointer;background:var(--bg);color:var(--accent);box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);font-size:12px">Edit</button>
        <button onclick="deleteItem(${globalIdx})" style="flex:1;border:0;border-radius:9999px;padding:6px;cursor:pointer;background:var(--bg);color:#e57373;box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);font-size:12px">Șterge</button>
      </div>
    `;
    itemsGrid.appendChild(card);
  });
});

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = `
    padding: 12px 18px;
    border-radius: 9999px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    box-shadow: 9px 9px 16px rgba(163,177,198,.45), -9px -9px 16px rgba(255,255,255,.65);
    animation: toastIn .3s ease-out forwards;
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

updateCounts();
renderGrid();