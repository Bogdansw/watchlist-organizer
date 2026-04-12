const themeBtn = document.getElementById('theme-toggle-btn');
const sunIcon = document.querySelector('.theme-toggle__icon--sun');
const moonIcon = document.querySelector('.theme-toggle__icon--moon');
const categoryBtns = document.querySelectorAll('.category-btn');
const currentCatEl = document.getElementById('current-category');
const itemsCountEl = document.getElementById('items-count');
const itemsGrid = document.getElementById('items-grid');
const dialog = document.getElementById('item-dialog');
const form = document.getElementById('item-form');
const addBtn = document.getElementById('add-item-btn');
const cancelBtn = document.getElementById('cancel-btn');
const modalTitle = document.getElementById('modal-title');
const submitBtn = document.getElementById('form-submit-btn');
const searchBar = document.getElementById('search-bar');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_KEY = '0eeabdb8ab5281d5b50dded7185c5b7a';

const CATEGORY_LABELS = {
  watching: 'Urmăresc',
  planned: 'Planificat',
  rewatching: 'Re-vizionare',
  paused: 'Întrerupt',
  dropped: 'Abandonat',
  favorites: 'Favorite'
};

const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
const ICON_EDIT = 'M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.97-1.66z';
const ICON_DELETE = 'M6 7h12v2H6V7zm2 3h8l-1 11H9L8 10zm3-5h2l1 1h4v2H6V6h4l1-1z';
const ICON_HEART = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const ICON_MOVIE = 'M4 6h16v12H4V6zm3 2v2h2V8H7zm0 4v2h2v-2H7zm8-4v2h2V8h-2zm0 4v2h2v-2h-2zm-5-4v6h4V8h-4z';
const ICON_SERIES = 'M21 3H3v14h7v4l4-4h7V3zM7 9h10v2H7V9zm0 4h7v2H7v-2z';

const state = {
  items: normalizeItems(JSON.parse(localStorage.getItem('items') || '[]')),
  currentCategory: 'watching',
  searchQuery: '',
  theme: localStorage.getItem('darkMode') === 'true' ? 'dark' : 'light'
};

let editingId = null;
let searchDebounce = null;
let tmdbDebounce = null;
let selectedTmdb = null;

const titleInput = form.querySelector('#title');
const imageInput = form.querySelector('#image-url');
const typeInput = form.querySelector('#type');
const progressField = document.getElementById('progress-field');
const titleField = titleInput.closest('.form-field');
const imageField = imageInput.closest('.form-field');

const tmdbField = document.createElement('div');
tmdbField.className = 'form-field';
tmdbField.id = 'tmdb-search-field';
tmdbField.innerHTML = '<label for="tmdb-search-input">Caută în TMDB</label><input type="search" id="tmdb-search-input" autocomplete="off" placeholder="Scrie numele filmului sau serialului"><div id="tmdb-search-results" hidden style="display:grid;gap:8px;max-height:260px;overflow:auto;margin-top:8px;"></div>';
form.insertBefore(tmdbField, titleField);
const tmdbInput = tmdbField.querySelector('#tmdb-search-input');
const tmdbResults = tmdbField.querySelector('#tmdb-search-results');

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, index) => ({
    id: item.id || `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    title: String(item.title || '').trim(),
    type: item.type === 'movie' ? 'movie' : 'series',
    category: CATEGORY_LABELS[item.category] ? item.category : 'watching',
    progress: String(item.progress || '').trim(),
    rating: Number(item.rating) > 0 ? Math.min(10, Number(item.rating)) : null,
    imageUrl: String(item.imageUrl || '').trim(),
    notes: String(item.notes || '').trim(),
    tmdbId: item.tmdbId || null,
    addedAt: item.addedAt || new Date().toISOString(),
    previousCategory: item.previousCategory || null
  }));
}

function saveItems() {
  localStorage.setItem('items', JSON.stringify(state.items));
}

function applyTheme(dark) {
  document.body.classList.toggle('dark-mode', dark);
  themeBtn.setAttribute('aria-pressed', String(dark));
  sunIcon.hidden = dark;
  moonIcon.hidden = !dark;
  state.theme = dark ? 'dark' : 'light';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hasTmdbKey() {
  return TMDB_KEY && TMDB_KEY.trim().length > 0;
}

function tmdbTypeToApi(type) {
  if (type === 'movie') return 'movie';
  if (type === 'series') return 'tv';
  return 'multi';
}

function tmdbApiToType(mediaType) {
  return mediaType === 'movie' ? 'movie' : 'series';
}

function formatTmdbResult(result, mediaType) {
  const yearRaw = mediaType === 'movie' ? result.release_date : result.first_air_date;
  return {
    tmdbId: result.id,
    title: result.title || result.name || '',
    year: yearRaw ? String(yearRaw).slice(0, 4) : '',
    posterPath: result.poster_path || '',
    overview: result.overview || '',
    type: tmdbApiToType(mediaType)
  };
}

async function searchTMDB(query, type = 'multi') {
  if (!hasTmdbKey()) {
    throw new Error('TMDB_API_KEY_MISSING');
  }

  const cleaned = String(query || '').trim();
  if (cleaned.length < 2) return [];

  const apiType = tmdbTypeToApi(type);

  if (apiType === 'multi') {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleaned)}&include_adult=false&language=ro-RO`),
      fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleaned)}&include_adult=false&language=ro-RO`)
    ]);

    if (!movieResponse.ok || !tvResponse.ok) {
      throw new Error('TMDB_SEARCH_FAILED');
    }

    const movieJson = await movieResponse.json();
    const tvJson = await tvResponse.json();
    const movies = Array.isArray(movieJson.results) ? movieJson.results.map(item => formatTmdbResult(item, 'movie')) : [];
    const series = Array.isArray(tvJson.results) ? tvJson.results.map(item => formatTmdbResult(item, 'tv')) : [];
    return [...movies, ...series].filter(item => item.title).slice(0, 8);
  }

  const response = await fetch(`${TMDB_BASE}/search/${apiType}?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleaned)}&include_adult=false&language=ro-RO`);
  if (!response.ok) {
    throw new Error('TMDB_SEARCH_FAILED');
  }
  const data = await response.json();
  const base = Array.isArray(data.results) ? data.results : [];
  const mapped = base.map(item => formatTmdbResult(item, apiType));
  return mapped.filter(item => item.title).slice(0, 8);
}

async function getTMDBDetails(id, type) {
  if (!hasTmdbKey()) {
    throw new Error('TMDB_API_KEY_MISSING');
  }

  const apiType = tmdbTypeToApi(type);
  if (apiType === 'multi') {
    throw new Error('TMDB_INVALID_DETAILS_TYPE');
  }

  const response = await fetch(`${TMDB_BASE}/${apiType}/${id}?api_key=${TMDB_KEY}&language=ro-RO&append_to_response=credits,videos`);
  if (!response.ok) {
    throw new Error('TMDB_DETAILS_FAILED');
  }

  const data = await response.json();
  const cast = Array.isArray(data.credits?.cast) ? data.credits.cast.slice(0, 5).map(person => person.name) : [];
  const trailer = Array.isArray(data.videos?.results)
    ? data.videos.results.find(video => video.site === 'YouTube' && video.type === 'Trailer')?.key || null
    : null;

  return {
    genres: Array.isArray(data.genres) ? data.genres.map(genre => genre.name) : [],
    runtime: data.runtime || null,
    episodes: data.number_of_episodes || null,
    cast,
    tmdbRating: data.vote_average || null,
    trailerKey: trailer,
    overview: data.overview || ''
  };
}

function renderTmdbLoading() {
  tmdbResults.innerHTML = `
    <div style="display:grid;gap:8px;">
      <div style="height:62px;border-radius:14px;background:linear-gradient(90deg,rgba(163,177,198,.15),rgba(163,177,198,.35),rgba(163,177,198,.15));background-size:200% 100%;animation:float 1.2s ease-in-out infinite;"></div>
      <div style="height:62px;border-radius:14px;background:linear-gradient(90deg,rgba(163,177,198,.15),rgba(163,177,198,.35),rgba(163,177,198,.15));background-size:200% 100%;animation:float 1.2s ease-in-out infinite;"></div>
      <div style="height:62px;border-radius:14px;background:linear-gradient(90deg,rgba(163,177,198,.15),rgba(163,177,198,.35),rgba(163,177,198,.15));background-size:200% 100%;animation:float 1.2s ease-in-out infinite;"></div>
    </div>
  `;
  tmdbResults.hidden = false;
}

function hideTmdbResults() {
  tmdbResults.hidden = true;
  tmdbResults.innerHTML = '';
}

function renderTmdbResults(results) {
  if (!results.length) {
    tmdbResults.innerHTML = '<p style="margin:0;color:var(--muted);padding:8px;">Niciun rezultat TMDB.</p>';
    tmdbResults.hidden = false;
    return;
  }

  tmdbResults.innerHTML = results.map(result => {
    const poster = result.posterPath
      ? `${TMDB_IMG}${result.posterPath}`
      : '';
    const typeLabel = result.type === 'movie' ? 'FILM' : 'SERIAL';
    return `
      <button type="button" data-tmdb-id="${result.tmdbId}" data-tmdb-type="${result.type}" style="width:100%;border:0;background:var(--bg);border-radius:14px;padding:8px;display:flex;align-items:center;gap:10px;cursor:pointer;box-shadow:9px 9px 16px rgba(163,177,198,.35),-9px -9px 16px rgba(255,255,255,.45);margin-bottom:8px;text-align:left;">
        ${poster ? `<img src="${poster}" alt="${escapeHtml(result.title)}" width="40" height="60" style="border-radius:8px;object-fit:cover;">` : `<div style="width:40px;height:60px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;box-shadow:inset 3px 3px 6px rgba(163,177,198,.45),inset -3px -3px 6px rgba(255,255,255,.55);color:var(--muted);font-size:10px;">N/A</div>`}
        <span style="display:flex;flex-direction:column;gap:4px;">
          <strong style="font-size:13px;line-height:1.2;color:var(--fg);">${escapeHtml(result.title)}</strong>
          <span style="font-size:11px;color:var(--muted);">${escapeHtml(result.year || 'Fără an')} · ${typeLabel}</span>
        </span>
      </button>
    `;
  }).join('');

  tmdbResults.hidden = false;
  tmdbResults.querySelectorAll('button[data-tmdb-id]').forEach(button => {
    button.addEventListener('click', () => {
      const chosen = results.find(entry => String(entry.tmdbId) === button.dataset.tmdbId && entry.type === button.dataset.tmdbType);
      if (!chosen) return;
      populateFormFromTMDB(chosen);
    });
  });
}

async function populateFormFromTMDB(result) {
  selectedTmdb = result;
  form.title.value = result.title;
  form.type.value = result.type;
  form['image-url'].value = result.posterPath ? `${TMDB_IMG}${result.posterPath}` : '';
  tmdbInput.value = `${result.title}${result.year ? ` (${result.year})` : ''}`;
  titleField.style.display = 'flex';
  imageField.style.display = 'flex';
  progressField.style.display = form.type.value === 'movie' ? 'none' : 'flex';
  hideTmdbResults();

  try {
    const details = await getTMDBDetails(result.tmdbId, result.type);
    if (!form.notes.value.trim() && details.overview) {
      form.notes.value = details.overview;
    }
    if (result.type === 'movie') {
      form.progress.value = '';
    }
  } catch {
    showToast('Nu s-au putut prelua detaliile TMDB');
  }
}

function createStarRating(rating) {
  const safeRating = Number(rating) || 0;
  let html = '';
  for (let i = 1; i <= 10; i += 1) {
    const color = i <= safeRating ? 'var(--accent)' : 'var(--muted)';
    html += `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="color:${color}"><path fill="currentColor" d="${STAR_PATH}"/></svg>`;
  }
  return `<div style="display:flex;align-items:center;gap:2px" title="${safeRating}/10">${html}</div>`;
}

function placeholderPoster(type) {
  const iconPath = type === 'movie' ? ICON_MOVIE : ICON_SERIES;
  return `
    <div style="width:100%;aspect-ratio:2/3;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--bg);box-shadow:inset 6px 6px 10px rgba(163,177,198,.45),inset -6px -6px 10px rgba(255,255,255,.55);color:var(--muted)">
      <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><path fill="currentColor" d="${iconPath}"/></svg>
    </div>
  `;
}

function getProgressLabel(item) {
  if (item.type === 'movie') return 'Complet';
  return item.progress ? `Ep ${escapeHtml(item.progress)}` : 'Ep -';
}

function renderCard(item) {
  const typeLabel = item.type === 'movie' ? 'FILM' : 'SERIAL';
  const isFavorite = item.category === 'favorites';
  const poster = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="Poster ${escapeHtml(item.title)}" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:16px;">`
    : placeholderPoster(item.type);

  return `
    <article class="item-card" role="listitem" draggable="true" data-id="${item.id}" style="padding:14px;display:flex;flex-direction:column;gap:10px;position:relative;">
      ${poster}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:11px;line-height:1;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:5px 8px;border-radius:9999px;background:var(--bg);box-shadow:inset 3px 3px 6px rgba(163,177,198,.45),inset -3px -3px 6px rgba(255,255,255,.55);">${typeLabel}</span>
        ${createStarRating(item.rating)}
      </div>
      <strong style="font-size:14px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:38px;">${escapeHtml(item.title)}</strong>
      <span style="font-size:12px;color:var(--muted)">${getProgressLabel(item)}</span>
      <div data-actions style="display:flex;gap:6px;margin-top:auto;opacity:0;transform:translateY(4px);transition:opacity 180ms ease-out,transform 180ms ease-out;pointer-events:none;">
        <button type="button" data-action="edit" data-id="${item.id}" title="Editează" style="flex:1;min-height:32px;border:0;border-radius:9999px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--bg);color:var(--accent);box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="${ICON_EDIT}"/></svg>
        </button>
        <button type="button" data-action="favorite" data-id="${item.id}" title="Favorite" style="flex:1;min-height:32px;border:0;border-radius:9999px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--bg);color:${isFavorite ? 'var(--accent)' : 'var(--muted)'};box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="transform:${isFavorite ? 'scale(1.3)' : 'scale(1)'};transition:transform 220ms ease-out,color 220ms ease-out;"><path fill="currentColor" d="${ICON_HEART}"/></svg>
        </button>
        <button type="button" data-action="delete" data-id="${item.id}" title="Șterge" style="flex:1;min-height:32px;border:0;border-radius:9999px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--bg);color:#e57373;box-shadow:inset 3px 3px 6px rgba(163,177,198,.55),inset -3px -3px 6px rgba(255,255,255,.65);">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="${ICON_DELETE}"/></svg>
        </button>
      </div>
    </article>
  `;
}

function filterItems(query) {
  state.searchQuery = String(query || '').trim().toLowerCase();
  return state.searchQuery;
}

function getCategoryItems(category) {
  return state.items.filter(item => item.category === category);
}

function getVisibleItems(category) {
  const base = getCategoryItems(category);
  if (!state.searchQuery) return base;
  return base.filter(item => item.title.toLowerCase().includes(state.searchQuery));
}

function updateCounts() {
  categoryBtns.forEach(btn => {
    const category = btn.dataset.category;
    const count = getCategoryItems(category).length;
    const countNode = document.querySelector(`[data-count-for="${category}"]`);
    if (countNode) countNode.textContent = String(count);
  });
}

function attachCardEvents() {
  const cards = itemsGrid.querySelectorAll('[data-id]');
  cards.forEach(card => {
    const actions = card.querySelector('[data-actions]');
    if (actions) {
      card.addEventListener('mouseenter', () => {
        actions.style.opacity = '1';
        actions.style.transform = 'translateY(0)';
        actions.style.pointerEvents = 'auto';
      });
      card.addEventListener('mouseleave', () => {
        actions.style.opacity = '0';
        actions.style.transform = 'translateY(4px)';
        actions.style.pointerEvents = 'none';
      });
    }

    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.55';
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
    });
  });

  itemsGrid.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      const { action, id } = e.currentTarget.dataset;
      if (action === 'edit') openModal('edit', id);
      if (action === 'favorite') toggleFavorite(id);
      if (action === 'delete') deleteItem(id);
    });
  });
}

function renderGrid(category = state.currentCategory) {
  const visible = getVisibleItems(category);
  itemsCountEl.textContent = `${visible.length} elemente`;

  if (visible.length === 0) {
    const message = state.searchQuery
      ? `Niciun rezultat pentru "${escapeHtml(state.searchQuery)}".`
      : 'Niciun element în această categorie.';
    itemsGrid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">${message}</p>`;
    return;
  }

  itemsGrid.innerHTML = visible.map(renderCard).join('');
  attachCardEvents();
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = 'padding:12px 18px;border-radius:9999px;background:var(--accent);color:#fff;font-size:14px;box-shadow:9px 9px 16px rgba(163,177,198,.45),-9px -9px 16px rgba(255,255,255,.65);animation:toastIn .3s ease-out forwards;';
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function addItem(data) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: data.title,
    type: data.type,
    category: data.category,
    progress: data.progress,
    rating: data.rating,
    imageUrl: data.imageUrl,
    notes: data.notes,
    tmdbId: data.tmdbId || null,
    addedAt: new Date().toISOString(),
    previousCategory: null
  };
  state.items.unshift(item);
  saveItems();
  updateCounts();
  renderGrid();
  const card = itemsGrid.querySelector(`[data-id="${item.id}"]`);
  if (card) card.style.animation = 'slideUp .3s ease-out forwards, fadeIn .3s ease-out forwards';
  showToast(`"${item.title}" adăugat`);
}

function editItem(id, data) {
  const index = state.items.findIndex(item => item.id === id);
  if (index < 0) return;
  state.items[index] = {
    ...state.items[index],
    ...data
  };
  saveItems();
  updateCounts();
  renderGrid();
  showToast('Modificări salvate');
}

function finalizeDelete(id) {
  state.items = state.items.filter(item => item.id !== id);
  saveItems();
  updateCounts();
  renderGrid();
}

function deleteItem(id) {
  const card = itemsGrid.querySelector(`[data-id="${id}"]`);
  const target = state.items.find(item => item.id === id);
  if (!target) return;

  if (card) {
    card.style.animation = 'fadeOut .22s ease-out forwards, slideDown .22s ease-out forwards';
    setTimeout(() => {
      finalizeDelete(id);
      showToast(`"${target.title}" șters`);
    }, 230);
    return;
  }

  finalizeDelete(id);
  showToast(`"${target.title}" șters`);
}

function toggleFavorite(id) {
  const index = state.items.findIndex(item => item.id === id);
  if (index < 0) return;
  const item = state.items[index];

  if (item.category === 'favorites') {
    item.category = item.previousCategory || 'watching';
    item.previousCategory = null;
  } else {
    item.previousCategory = item.category;
    item.category = 'favorites';
  }

  saveItems();
  updateCounts();
  renderGrid();
}

function switchCategory(category) {
  state.currentCategory = category;
  currentCatEl.textContent = CATEGORY_LABELS[category];
  categoryBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === category);
  });
  renderGrid(category);
}

function setAddModeLayout() {
  tmdbField.style.display = 'flex';
  titleField.style.display = 'none';
  imageField.style.display = 'none';
  selectedTmdb = null;
  tmdbInput.value = '';
  form.title.value = '';
  form['image-url'].value = '';
  hideTmdbResults();
}

function setEditModeLayout() {
  tmdbField.style.display = 'none';
  titleField.style.display = 'flex';
  imageField.style.display = 'flex';
}

function openModal(mode, itemId) {
  form.reset();
  editingId = null;
  hideTmdbResults();

  if (mode === 'edit' && itemId) {
    const item = state.items.find(entry => entry.id === itemId);
    if (!item) return;
    setEditModeLayout();
    editingId = item.id;
    modalTitle.textContent = 'Editează';
    submitBtn.textContent = 'Salvează modificările';
    form.title.value = item.title;
    form.type.value = item.type;
    form.category.value = item.category;
    form.progress.value = item.progress || '';
    form['image-url'].value = item.imageUrl || '';
    form.notes.value = item.notes || '';
    if (item.rating) {
      const rating = form.querySelector(`input[name="rating"][value="${item.rating}"]`);
      if (rating) rating.checked = true;
    }
    form.title.focus();
  } else {
    setAddModeLayout();
    modalTitle.textContent = 'Adaugă film sau serial';
    submitBtn.textContent = 'Salvează';
    form.category.value = state.currentCategory;
    tmdbInput.focus();
    if (!hasTmdbKey()) {
      showToast('Pentru TMDB este necesară cheia API');
    }
  }

  progressField.style.display = typeInput.value === 'movie' ? 'none' : 'flex';
  dialog.showModal();
}

function setupCategoryDnD() {
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => switchCategory(btn.dataset.category));

    btn.addEventListener('dragover', e => {
      e.preventDefault();
      btn.classList.add('neu-raised-hover');
    });

    btn.addEventListener('dragleave', () => {
      btn.classList.remove('neu-raised-hover');
    });

    btn.addEventListener('drop', e => {
      e.preventDefault();
      btn.classList.remove('neu-raised-hover');
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      const item = state.items.find(entry => entry.id === id);
      if (!item) return;

      const nextCategory = btn.dataset.category;
      if (nextCategory === 'favorites') {
        if (item.category !== 'favorites') item.previousCategory = item.category;
        item.category = 'favorites';
      } else {
        item.category = nextCategory;
      }

      saveItems();
      updateCounts();
      renderGrid();
    });
  });
}

applyTheme(localStorage.getItem('darkMode') === 'true');

themeBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  applyTheme(!isDark);
  localStorage.setItem('darkMode', String(!isDark));
});

typeInput.addEventListener('change', () => {
  progressField.style.display = typeInput.value === 'movie' ? 'none' : 'flex';
});

addBtn.addEventListener('click', () => openModal('add'));

cancelBtn.addEventListener('click', () => {
  hideTmdbResults();
  dialog.close();
});

dialog.addEventListener('click', e => {
  if (e.target === dialog) {
    hideTmdbResults();
    dialog.close();
  }
});

document.addEventListener('click', e => {
  if (!dialog.open || tmdbResults.hidden) return;
  if (tmdbField.contains(e.target)) return;
  hideTmdbResults();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideTmdbResults();
  }
});

tmdbInput.addEventListener('input', () => {
  clearTimeout(tmdbDebounce);
  const query = tmdbInput.value.trim();
  selectedTmdb = null;
  titleField.style.display = 'none';
  imageField.style.display = 'none';
  form.title.value = '';
  form['image-url'].value = '';

  if (query.length < 2) {
    hideTmdbResults();
    return;
  }

  tmdbDebounce = setTimeout(async () => {
    try {
      renderTmdbLoading();
      const results = await searchTMDB(query, form.type.value || 'multi');
      renderTmdbResults(results);
    } catch (error) {
      hideTmdbResults();
      if (String(error.message) === 'TMDB_API_KEY_MISSING') {
        showToast('Lipsește cheia TMDB API');
      } else {
        showToast('Nu s-a putut conecta la TMDB');
      }
    }
  }, 350);
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const ratingInput = form.querySelector('input[name="rating"]:checked');
  const isAddMode = !editingId;

  if (isAddMode && !selectedTmdb) {
    showToast('Selectează mai întâi titlul din TMDB');
    return;
  }

  const payload = {
    title: form.title.value.trim(),
    type: form.type.value,
    category: form.category.value,
    progress: form.progress.value.trim(),
    rating: ratingInput ? Number(ratingInput.value) : null,
    imageUrl: form['image-url'].value.trim(),
    notes: form.notes.value.trim(),
    tmdbId: selectedTmdb?.tmdbId || null
  };

  if (!payload.title || !payload.type || !payload.category) return;

  if (editingId) {
    editItem(editingId, payload);
  } else {
    addItem(payload);
  }

  hideTmdbResults();
  dialog.close();
});

searchBar.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  const query = e.target.value || '';
  searchDebounce = setTimeout(() => {
    filterItems(query);
    renderGrid();
  }, 300);
});

window.editItem = id => openModal('edit', id);
window.deleteItem = deleteItem;
window.toggleFavorite = toggleFavorite;

setupCategoryDnD();
updateCounts();
switchCategory(state.currentCategory);