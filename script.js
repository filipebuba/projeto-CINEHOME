class CarrosselNetflix {
            constructor(container) {
                this.container = container;
                this.carrossel = container.querySelector('.filmes-carrossel');
                this.prevBtn = container.querySelector('.carrossel-prev');
                this.nextBtn = container.querySelector('.carrossel-next');
                this.cards = container.querySelectorAll('.filme-card');
                
                this.currentIndex = 0;
                this.cardsPerView = this.getCardsPerView();
                this.totalSlides = Math.ceil(this.cards.length / this.cardsPerView);
                this.autoScrollInterval = null;
                
                this.init();
            }
            
            getCardsPerView() {
                const width = window.innerWidth;
                if (width < 576) return 2;
                if (width < 768) return 3;
                if (width < 992) return 4;
                if (width < 1200) return 5;
                return 6;
            }
            
            init() {
                this.prevBtn.addEventListener('click', () => this.prev());
                this.nextBtn.addEventListener('click', () => this.next());
                
                // Navegação por keyboard
                this.container.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') this.prev();
                    if (e.key === 'ArrowRight') this.next();
                });
                
                // Auto-scroll
                this.startAutoScroll();
                
                // Pausar auto-scroll no hover
                this.container.addEventListener('mouseenter', () => this.stopAutoScroll());
                this.container.addEventListener('mouseleave', () => this.startAutoScroll());
                
                // Atualizar na resize da janela
                window.addEventListener('resize', () => this.handleResize());
            }
            
            handleResize() {
                this.cardsPerView = this.getCardsPerView();
                this.totalSlides = Math.ceil(this.cards.length / this.cardsPerView);
                if (this.cards.length > 0) {
                    this.goToSlide(0);
                }
            }
            
            prev() {
                this.currentIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
                this.scrollToCurrent();
                this.restartAutoScroll();
            }
            
            next() {
                this.currentIndex = (this.currentIndex + 1) % this.totalSlides;
                this.scrollToCurrent();
                this.restartAutoScroll();
            }
            
            goToSlide(index) {
                this.currentIndex = index;
                this.scrollToCurrent();
                this.restartAutoScroll();
            }
            
            scrollToCurrent() {
                if (!this.cards || this.cards.length === 0) return;
                const cardWidth = this.cards[0].offsetWidth + 8; // width + gap
                const scrollAmount = this.currentIndex * this.cardsPerView * cardWidth;
                this.carrossel.style.transform = `translateX(-${scrollAmount}px)`;
            }
            
            startAutoScroll() {
                this.autoScrollInterval = setInterval(() => {
                    this.next();
                }, 5000); // Muda a cada 5 segundos
            }
            
            stopAutoScroll() {
                if (this.autoScrollInterval) {
                    clearInterval(this.autoScrollInterval);
                    this.autoScrollInterval = null;
                }
            }
            
            restartAutoScroll() {
                this.stopAutoScroll();
                this.startAutoScroll();
            }
        }

        // Inicializar todos os carrosseis quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    const carrosselContainers = document.querySelectorAll('.carrossel-container');
    carrosselContainers.forEach(container => {
        new CarrosselNetflix(container);
    });
});

// ---------------------------
// Integração direta com TMDB (frontend-only)
// ---------------------------

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

let TMDB_API_KEY_CACHE = null;
async function loadEnvApiKey() {
  if (TMDB_API_KEY_CACHE) return TMDB_API_KEY_CACHE;
  try {
    const host = location.hostname;
    const isLocal = location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
    if (!isLocal) return null;
    const resp = await fetch('/.env', { cache: 'no-store' });
    if (!resp.ok) return null;
    const text = await resp.text();
    const match = text.match(/^API_KEY\s*=\s*(.+)$/m);
    if (match) {
      TMDB_API_KEY_CACHE = match[1].trim().replace(/^['"]|['"]$/g, '');
      return TMDB_API_KEY_CACHE;
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function ensureApiKey() {
  const fromLS = (localStorage.getItem('TMDB_API_KEY') || '').trim();
  if (fromLS) return fromLS;
  if (TMDB_API_KEY_CACHE) return TMDB_API_KEY_CACHE;
  const fromEnv = await loadEnvApiKey();
  if (fromEnv) return fromEnv;
  const fromWindow = (window.TMDB_API_KEY || '').toString().trim();
  if (fromWindow) return fromWindow;
  throw new Error('TMDB API key não configurada. Defina TMDB_API_KEY no localStorage, config.js (window.TMDB_API_KEY) ou em .env (API_KEY=...).');
}

async function searchTMDB(query, type = 'movie', { year = '', genreId = '' } = {}) {
  const apiKey = await ensureApiKey();
  const isQuery = query && query.trim().length > 0;
  let url;
  if (isQuery) {
    url = `${TMDB_BASE_URL}/search/${type}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&query=${encodeURIComponent(query)}&page=1&include_adult=false`;
    if (type === 'movie' && year) url += `&year=${encodeURIComponent(year)}`;
  } else {
    url = `${TMDB_BASE_URL}/discover/${type}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&sort_by=popularity.desc&page=1&include_adult=false`;
    if (genreId) url += `&with_genres=${encodeURIComponent(genreId)}`;
    if (year) url += type === 'movie' ? `&primary_release_year=${encodeURIComponent(year)}` : `&first_air_date_year=${encodeURIComponent(year)}`;
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Erro TMDB (${resp.status}): ${text}`);
  }
  const data = await resp.json();
  let results = data.results || [];
  if (isQuery) {
    if (genreId) {
      results = results.filter(r => Array.isArray(r.genre_ids) && r.genre_ids.includes(Number(genreId)));
    }
    if (year) {
      results = results.filter(r => {
        const d = type === 'movie' ? r.release_date : r.first_air_date;
        return d && d.slice(0,4) === String(year);
      });
    }
  }
  return results;
}

async function fetchGenres(type = 'movie') {
  const apiKey = await ensureApiKey();
  const url = `${TMDB_BASE_URL}/genre/${type}/list?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.genres || [];
}

function buildCarrosselContainer() {
  const el = document.createElement('div');
  el.className = 'carrossel-container';
  el.innerHTML = `
    <button class="carrossel-btn carrossel-prev" aria-label="Voltar">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </button>
    <div class="carrossel-wrapper">
      <div class="filmes-carrossel"></div>
    </div>
    <button class="carrossel-btn carrossel-next" aria-label="Avançar">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
      </svg>
    </button>
  `;
  return el;
}

function ensureSearchResultsSection() {
  let section = document.getElementById('search-results-section');
  if (!section) {
    section = document.createElement('section');
    section.className = 'top10-section';
    section.id = 'search-results-section';
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Resultados da pesquisa</h2>
        <div class="section-gradient"></div>
      </div>
    `;
    document.body.appendChild(section);
  }
  return section;
}

function renderSearchResults(results) {
  const section = ensureSearchResultsSection();
  const existing = section.querySelector('.carrossel-container');
  const container = buildCarrosselContainer();
  if (existing) {
    existing.replaceWith(container);
  } else {
    section.appendChild(container);
  }
  const listEl = container.querySelector('.filmes-carrossel');

  listEl.innerHTML = '';
  if (!results.length) {
    listEl.innerHTML = '<p style="padding: 0 80px;">Nenhum resultado encontrado.</p>';
    return;
  }

  results.forEach(r => {
    const title = r.title || r.name || 'Sem título';
    const poster = r.poster_path ? `${TMDB_IMG_BASE}${r.poster_path}` : 'https://via.placeholder.com/300x450/333333/FFFFFF?text=SEM+POSTER';
    const year = (r.release_date || r.first_air_date || '').slice(0,4);
    const card = document.createElement('div');
    card.className = 'filme-card';
    card.innerHTML = `
      <div class="filme-image" style="background-image: url('${poster}')">
        <div class="filme-overlay">
          <div class="filme-info">
            <h3 class="filme-titulo">${title}</h3>
            <div class="filme-meta">
              ${year ? `<span class="ano">${year}</span>` : ''}
            </div>
            <div class="filme-actions">
              <button class="play-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Assistir
              </button>
              <button class="info-btn">+ Info</button>
            </div>
          </div>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });

  // Inicializa carrossel para a seção de resultados
  new CarrosselNetflix(container);
}

function setupSearch() {
  const searchInput = document.querySelector('#search-query');
  const searchButton = document.querySelector('#search-btn');
  const typeSelect = document.querySelector('#search-type');
  const genreSelect = document.querySelector('#search-genre');
  const yearInput = document.querySelector('#search-year');
  if (!searchInput || !searchButton || !typeSelect || !genreSelect || !yearInput) return;

  const hydrateGenres = async () => {
    try {
      const genres = await fetchGenres(typeSelect.value);
      genreSelect.innerHTML = '<option value="">Gênero</option>' +
        genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    } catch {}
  };
  hydrateGenres();
  typeSelect.addEventListener('change', hydrateGenres);

  const runSearch = async () => {
    const q = (searchInput.value || '').trim();
    const type = typeSelect.value;
    const year = (yearInput.value || '').trim();
    const genreId = genreSelect.value || '';
    try {
      const results = await searchTMDB(q, type, { year, genreId });
      renderSearchResults(results);
    } catch (err) {
      const section = ensureSearchResultsSection();
      const existing = section.querySelector('.carrossel-container');
      if (!existing) section.appendChild(buildCarrosselContainer());
      const listEl = section.querySelector('.filmes-carrossel');
      if (listEl) {
        listEl.innerHTML = `<p style="padding: 0 80px; color: #f88;">${err.message}</p>`;
      }
    }
  };

  searchButton.addEventListener('click', runSearch);
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') runSearch();
  });
}

document.addEventListener('DOMContentLoaded', setupSearch);

// ---------------------------
// Seções populadas automaticamente (Tendências)
// ---------------------------

async function fetchTrending(type = 'movie') {
  const apiKey = await ensureApiKey();
  const url = `${TMDB_BASE_URL}/trending/${type}/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.results || [];
}

// Descoberta (discover) com filtros via atributos data-*
async function discoverTMDB(type = 'movie', {
  sort = 'popularity.desc',
  genre = '',
  originalLanguage = '',
  language = 'pt-BR'
} = {}) {
  const apiKey = await ensureApiKey();
  const url = new URL(`${TMDB_BASE_URL}/discover/${type}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', language || 'pt-BR');
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('page', '1');
  if (sort) url.searchParams.set('sort_by', sort);
  if (genre) url.searchParams.set('with_genres', genre);
  if (originalLanguage) url.searchParams.set('with_original_language', originalLanguage);
  const resp = await fetch(url.toString());
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.results || [];
}

function ensureSectionWithTitle(id, title) {
  let section = document.getElementById(id);
  if (!section) {
    section = document.createElement('section');
    section.className = 'top10-section';
    section.id = id;
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">${title}</h2>
        <div class="section-gradient"></div>
      </div>
    `;
    document.body.appendChild(section);
  }
  return section;
}

async function populateTrendingSections() {
  const moviesSec = ensureSectionWithTitle('trending-movies', 'Em alta — Filmes');
  const tvSec = ensureSectionWithTitle('trending-tv', 'Em alta — Séries');
  try {
    const movies = await fetchTrending('movie');
    renderIntoSection(moviesSec, movies);
  } catch (e) {
    const container = buildCarrosselContainer();
    moviesSec.appendChild(container);
    const listEl = container.querySelector('.filmes-carrossel');
    listEl.innerHTML = `<p style="padding: 0 80px; color: #f88;">${e.message}</p>`;
  }
  try {
    const tv = await fetchTrending('tv');
    renderIntoSection(tvSec, tv);
  } catch (e) {
    const container = buildCarrosselContainer();
    tvSec.appendChild(container);
    const listEl = container.querySelector('.filmes-carrossel');
    listEl.innerHTML = `<p style="padding: 0 80px; color: #f88;">${e.message}</p>`;
  }
}

function renderIntoSection(section, results) {
  const existing = section.querySelector('.carrossel-container');
  const container = buildCarrosselContainer();
  if (existing) existing.replaceWith(container); else section.appendChild(container);
  const listEl = container.querySelector('.filmes-carrossel');
  listEl.innerHTML = '';
  if (!results || results.length === 0) {
    listEl.innerHTML = '<p style="padding: 0 80px;">Sem conteúdo disponível.</p>';
    return;
  }
  results.slice(0, 18).forEach(r => {
    const title = r.title || r.name || 'Sem título';
    const poster = r.poster_path ? `${TMDB_IMG_BASE}${r.poster_path}` : 'https://via.placeholder.com/300x450/333333/FFFFFF?text=SEM+POSTER';
    const year = (r.release_date || r.first_air_date || '').slice(0,4);
    const card = document.createElement('div');
    card.className = 'filme-card';
    card.innerHTML = `
      <div class="filme-image" style="background-image: url('${poster}')">
        <div class="filme-overlay">
          <div class="filme-info">
            <h3 class="filme-titulo">${title}</h3>
            <div class="filme-meta">${year ? `<span class="ano">${year}</span>` : ''}</div>
            <div class="filme-actions">
              <button class="play-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Assistir
              </button>
            </div>
          </div>
        </div>
      </div>`;
    listEl.appendChild(card);
  });
  new CarrosselNetflix(container);
}

document.addEventListener('DOMContentLoaded', populateTrendingSections);

// ---------------------------
// Seções configuradas no HTML via data-* (dinâmicas)
// ---------------------------

async function populateConfiguredSections() {
  const sections = document.querySelectorAll('.categoria-section[data-tmdb-mode]');
  for (const section of sections) {
    const mode = (section.dataset.tmdbMode || '').trim();
    const type = (section.dataset.tmdbType || 'movie').trim();
    try {
      let results = [];
      if (mode === 'trending') {
        results = await fetchTrending(type);
      } else if (mode === 'discover') {
        results = await discoverTMDB(type, {
          sort: section.dataset.tmdbSort || 'popularity.desc',
          genre: section.dataset.tmdbGenre || '',
          originalLanguage: section.dataset.tmdbOriginalLanguage || '',
          language: section.dataset.tmdbLanguage || 'pt-BR'
        });
      }
      renderIntoSection(section, results);
    } catch (e) {
      const container = buildCarrosselContainer();
      section.appendChild(container);
      const listEl = container.querySelector('.filmes-carrossel');
      listEl.innerHTML = `<p style="padding: 0 80px; color: #f88;">${e.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', populateConfiguredSections);

// ---------------------------
// Modal para configurar TMDB API Key
// ---------------------------

function openApiKeyModal() {
  const modal = document.getElementById('apiKeyModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeApiKeyModal() {
  const modal = document.getElementById('apiKeyModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initApiKeyModal() {
  const modal = document.getElementById('apiKeyModal');
  if (!modal) return;
  const openBtn = document.getElementById('open-api-modal-btn');
  const saveBtn = document.getElementById('saveApiKeyBtn');
  const closeBtn = document.getElementById('closeApiKeyBtn');
  const input = document.getElementById('tmdbKeyInput');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (input) input.value = (localStorage.getItem('TMDB_API_KEY') || '').trim();
      openApiKeyModal();
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const key = (input && input.value || '').trim();
      if (!key) {
        if (input) input.focus();
        return;
      }
      localStorage.setItem('TMDB_API_KEY', key);
      closeApiKeyModal();
      location.reload();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeApiKeyModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeApiKeyModal(); });
}

document.addEventListener('DOMContentLoaded', () => {
  initApiKeyModal();
  ensureApiKey().catch(() => {
    const inlineInput = document.getElementById('tmdbKeyInline');
    const modalInput = document.getElementById('tmdbKeyInput');
    const saved = (localStorage.getItem('TMDB_API_KEY') || '').trim();
    if (inlineInput) {
      inlineInput.value = saved;
      inlineInput.focus();
      // Não abrir modal se temos versão inline
    } else {
      if (modalInput) modalInput.value = saved;
      openApiKeyModal();
    }
  });
});

// ---------------------------
// Carrossel da capa (Hero) com TMDB + fallback
// ---------------------------
async function initHeroAutoCarousel() {
  const hero = document.querySelector('.hero-netflix');
  if (!hero) return;

  // Imagem atual usada como fallback
  const fallbackUrl = 'deadpool 2.jpeg';
  const titleEl = document.getElementById('heroTitle');
  const overviewEl = document.getElementById('heroOverview');
  const fallbackTitle = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : 'Capa';
  const fallbackOverview = overviewEl ? overviewEl.textContent.replace(/\s+/g, ' ').trim() : '';

  // Remover background inline (permitir fade entre camadas)
  try { hero.removeAttribute('style'); } catch (_) {}

  // Container de slides
  let bg = hero.querySelector('.hero-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.className = 'hero-bg';
    hero.prepend(bg);
  }

  // Carregar 6–9 itens do TMDB (imagem + título + sinopse)
  let items = [];
  try {
    const apiKey = await ensureApiKey();
    if (apiKey) {
      const base = 'https://image.tmdb.org/t/p/w1280';
      const movies = await fetchTrending('movie');
      const mItems = (movies || [])
        .filter(r => !!r.backdrop_path)
        .slice(0, 9)
        .map(r => ({
          src: `${base}${r.backdrop_path}`,
          title: r.title || r.name || 'Sem título',
          overview: (r.overview || '').trim()
        }));
      items = mItems;
      if (items.length < 6) {
        const tv = await fetchTrending('tv');
        const tItems = (tv || [])
          .filter(r => !!r.backdrop_path)
          .slice(0, 9 - items.length)
          .map(r => ({
            src: `${base}${r.backdrop_path}`,
            title: r.name || r.title || 'Sem título',
            overview: (r.overview || '').trim()
          }));
        items = items.concat(tItems);
      }
    }
  } catch (err) {
    console.warn('Hero carousel: fallback por erro/sem TMDB.', err);
  }

  if (!items || items.length === 0) {
    items = [{ src: fallbackUrl, title: fallbackTitle, overview: fallbackOverview }];
  }

  // Prefetch
  await Promise.all(items.map(it => new Promise(resolve => {
    const img = new Image();
    img.onload = resolve; img.onerror = resolve; img.src = it.src;
  })));

  // Construir slides
  bg.innerHTML = '';
  const slides = items.map((it, idx) => {
    const el = document.createElement('div');
    el.className = 'slide' + (idx === 0 ? ' active' : '');
    el.style.backgroundImage = `url("${it.src}")`;
    bg.appendChild(el);
    return el;
  });

  // Função para atualizar texto com leve fade
  function updateHeroText(idx) {
    const item = items[idx] || { title: fallbackTitle, overview: fallbackOverview };
    if (titleEl) {
      titleEl.style.opacity = 0;
      setTimeout(() => {
        titleEl.textContent = item.title;
        titleEl.style.opacity = 1;
      }, 150);
    }
    if (overviewEl) {
      overviewEl.style.opacity = 0;
      const ov = item.overview || 'Sinopse indisponível no momento.';
      setTimeout(() => {
        overviewEl.textContent = ov;
        overviewEl.style.opacity = 1;
      }, 150);
    }
  }

  // Texto inicial
  updateHeroText(0);

  // Alternância automática
  if (slides.length > 1) {
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove('active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('active');
      updateHeroText(i);
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', initHeroAutoCarousel);

// ---------------------------
// Ações da capa: Assista Agora e Detalhes
// ---------------------------
function initHeroActions() {
  const playBtn = document.querySelector('.hero-btn.play');
  const infoBtn = document.querySelector('.hero-btn.info');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      const target = document.getElementById('trending-movies')
        || document.querySelector('.top10-section')
        || document.querySelector('.categoria-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      const modal = document.getElementById('heroDetailsModal');
      if (!modal) return;
      const titleEl = document.querySelector('.hero-title');
      const resumoEl = document.querySelector('.hero-resumo');
      const mTitle = modal.querySelector('#heroDetailsTitle');
      const mBody = modal.querySelector('#heroDetailsBody');
      if (mTitle && titleEl) mTitle.textContent = titleEl.textContent.replace(/\s+/g, ' ').trim();
      if (mBody && resumoEl) mBody.textContent = resumoEl.textContent.replace(/\s+/g, ' ').trim();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const closeBtn = document.getElementById('heroDetailsClose');
      if (closeBtn) closeBtn.onclick = () => closeHeroDetailsModal();
      modal.addEventListener('click', (e) => { if (e.target === modal) closeHeroDetailsModal(); });
    });
  }
}

function closeHeroDetailsModal() {
  const modal = document.getElementById('heroDetailsModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', initHeroActions);

// ---------------------------
// Inline API Key (input sempre visível na barra superior)
// ---------------------------
function initInlineApiKeyControls() {
  const input = document.getElementById('tmdbKeyInline');
  const saveBtn = document.getElementById('save-api-inline-btn');
  if (!input || !saveBtn) return;
  input.value = (localStorage.getItem('TMDB_API_KEY') || '').trim();
  saveBtn.addEventListener('click', () => {
    const key = (input.value || '').trim();
    if (!key) {
      input.focus();
      return;
    }
    localStorage.setItem('TMDB_API_KEY', key);
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', initInlineApiKeyControls);
// ======================
// Footer: ano atual e preferências
// ======================
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const languageSelect = document.getElementById('footer-language');
  const regionSelect = document.getElementById('footer-region');

  // Carregar preferências salvas
  const savedLanguage = localStorage.getItem('cinehome.language');
  const savedRegion = localStorage.getItem('cinehome.region');
  if (languageSelect && savedLanguage) languageSelect.value = savedLanguage;
  if (regionSelect && savedRegion) regionSelect.value = savedRegion;

  // Salvar mudanças
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      localStorage.setItem('cinehome.language', e.target.value);
    });
  }
  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      localStorage.setItem('cinehome.region', e.target.value);
    });
  }
});

// ======================
// Injeção de footer externo em index.html
// ======================
function initFooterControls(root = document) {
  const yearEl = root.querySelector('#currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const languageSelect = root.querySelector('#footer-language');
  const regionSelect = root.querySelector('#footer-region');

  const savedLanguage = localStorage.getItem('cinehome.language');
  const savedRegion = localStorage.getItem('cinehome.region');
  if (languageSelect && savedLanguage) languageSelect.value = savedLanguage;
  if (regionSelect && savedRegion) regionSelect.value = savedRegion;

  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      localStorage.setItem('cinehome.language', e.target.value);
    });
  }
  if (regionSelect) {
    regionSelect.addEventListener('change', (e) => {
      localStorage.setItem('cinehome.region', e.target.value);
    });
  }
}

async function injectExternalFooter() {
  // Evita duplicar se o footer já existir (ex.: em footer.html)
  if (document.querySelector('.site-footer')) return;
  try {
    const resp = await fetch('footer.html');
    if (!resp.ok) return;
    const html = await resp.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const footerEl = temp.querySelector('footer.site-footer');
    if (footerEl) {
      document.body.appendChild(footerEl);
      initFooterControls(footerEl);
    }
  } catch (err) {
    console.warn('Falha ao carregar footer.html:', err);
  }
}

document.addEventListener('DOMContentLoaded', injectExternalFooter);