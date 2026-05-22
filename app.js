/**
 * ============================================================
 * LIREMONDE - APPLICATION SPA AVEC API REST
 * ============================================================
 * 
 * Architecture:
 *   - SPA (Single Page Application) avec Hash Routing
 *   - API REST via JSON Server (db.json) + Fallback localStorage
 *   - Toutes les requêtes utilisent async/await + try/catch
 * 
 * Endpoints API:
 *   GET    /livres        → Récupérer tous les livres
 *   GET    /livres/:id    → Récupérer un livre par ID
 *   POST   /livres        → Ajouter un livre
 *   PUT    /livres/:id    → Modifier un livre complet
 *   PATCH  /livres/:id    → Modifier partiellement (aLire)
 *   DELETE /livres/:id    → Supprimer un livre
 */

// ===== CONFIGURATION =====
const API_URL = 'http://localhost:3000/livres';

// ===== ÉTAT GLOBAL =====
let books = [];           // Liste des livres
let currentBook = null;   // Livre actuellement sélectionné
let currentFilter = 'all';// Filtre de genre actif
let editingBookId = null; // ID du livre en cours d'édition
let useLocalStorage = false; // true si JSON Server n'est pas disponible


// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Écoute les changements d'URL (hash) pour le routing SPA
    window.addEventListener('hashchange', handleRoute);

    // Charge la route initiale
    handleRoute();

    // Charge les données depuis l'API ou localStorage
    loadBooks();

    // Configure les événements globaux
    setupEventListeners();
});


// ============================================================
// ROUTING SPA (Sans rechargement de page)
// ============================================================

/**
 * Gère le changement de page selon le hash dans l'URL
 * Ex: #home, #reading, #admin
 */
function handleRoute() {
    // Récupère le hash sans le # (ex: "home", "reading", "admin")
    const hash = window.location.hash.slice(1) || 'home';

    // Cache toutes les pages
    document.querySelectorAll('[id^="page-"]').forEach(el => {
        el.classList.add('hidden');
    });

    // Affiche la page demandée
    const targetPage = document.getElementById('page-' + hash);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    } else {
        // Page par défaut si le hash n'existe pas
        document.getElementById('page-home').classList.remove('hidden');
    }

    // Met à jour l'état actif dans la navbar
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + hash) {
            link.classList.add('active');
        }
    });

    // Gère le bouton flottant (FAB)
    const fab = document.getElementById('fabBtn');
    if (hash === 'admin' || hash === 'reading') {
        fab.classList.add('hidden');
    } else {
        fab.classList.remove('hidden');
    }

    // Recharge le contenu spécifique à chaque page
    if (hash === 'reading') {
        renderReadingList();
    } else if (hash === 'admin') {
        renderAdminTable();
        updateStats();
    } else if (hash === 'home') {
        renderBooks();
    }

    // Remonte en haut de la page
    window.scrollTo(0, 0);
}

/**
 * Navigue vers une page (change le hash)
 * @param {string} page - Nom de la page (home, reading, admin)
 */
function navigateTo(page) {
    window.location.hash = page;
}


// ============================================================
// ÉVÉNEMENTS GLOBAUX
// ============================================================

function setupEventListeners() {
    // Ferme la modale quand on clique sur le fond noir
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Ferme les modales avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => {
                m.classList.remove('active');
            });
        }
    });
}


// ============================================================
// LOCALSTORAGE FALLBACK (si JSON Server n'est pas lancé)
// ============================================================

const STORAGE_KEY = 'liremonde_books';

/**
 * Charge les données initiales dans localStorage si vide
 */
function initLocalStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Charge les données de db.json embarquées
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
}

// Fonctions localStorage (fallback quand JSON Server n'est pas dispo)
function lsGetAll() {
    initLocalStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function lsGetById(id) {
    return lsGetAll().find(b => b.id === id) || null;
}

function lsCreate(book) {
    const all = lsGetAll();
    const newId = all.length > 0 ? Math.max(...all.map(b => b.id)) + 1 : 1;
    const newBook = { ...book, id: newId };
    all.push(newBook);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newBook;
}

function lsUpdate(id, book) {
    const all = lsGetAll();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...book, id };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[idx];
}

function lsDelete(id) {
    const all = lsGetAll().filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
}

function lsPatch(id, patch) {
    const all = lsGetAll();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return all[idx];
}


// ============================================================
// API REST - REQUÊTES HTTP (avec fallback localStorage)
// Toutes les fonctions utilisent async/await + try/catch
// ============================================================

/**
 * GET /livres - Récupère tous les livres
 * @returns {Array} Liste des livres
 */
async function apiGetAll() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        useLocalStorage = false;
        return await response.json();
    } catch (error) {
        console.warn('[API] JSON Server indisponible, utilisation de localStorage');
        useLocalStorage = true;
        return lsGetAll();
    }
}

/**
 * GET /livres/:id - Récupère un livre par son ID
 * @param {number} id - ID du livre
 * @returns {Object|null} Le livre trouvé ou null
 */
async function apiGetById(id) {
    try {
        if (useLocalStorage) return lsGetById(id);
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('[API] Fallback localStorage pour GET by ID');
        return lsGetById(id);
    }
}

/**
 * POST /livres - Crée un nouveau livre
 * @param {Object} book - Données du livre à créer
 * @returns {Object|null} Le livre créé ou null
 */
async function apiCreate(book) {
    try {
        if (useLocalStorage) {
            const result = lsCreate(book);
            showToast('success', `"${result.titre}" ajouté avec succès !`);
            return result;
        }
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        showToast('success', `"${data.titre}" ajouté avec succès !`);
        return data;
    } catch (error) {
        console.error('[API POST] Erreur:', error);
        showToast('error', 'Erreur lors de l\'ajout du livre');
        return null;
    }
}

/**
 * PUT /livres/:id - Met à jour complètement un livre
 * @param {number} id - ID du livre
 * @param {Object} book - Nouvelles données du livre
 * @returns {Object|null} Le livre mis à jour ou null
 */
async function apiUpdate(id, book) {
    try {
        if (useLocalStorage) {
            const result = lsUpdate(id, book);
            showToast('success', `"${result.titre}" modifié avec succès !`);
            return result;
        }
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        showToast('success', `"${data.titre}" modifié avec succès !`);
        return data;
    } catch (error) {
        console.error('[API PUT] Erreur:', error);
        showToast('error', 'Erreur lors de la modification');
        return null;
    }
}

/**
 * PATCH /livres/:id - Met à jour partiellement un livre
 * Utilisé pour changer le statut "aLire"
 * @param {number} id - ID du livre
 * @param {Object} patch - Champs à modifier
 * @returns {Object|null} Le livre mis à jour ou null
 */
async function apiPatch(id, patch) {
    try {
        if (useLocalStorage) return lsPatch(id, patch);
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('[API PATCH] Fallback localStorage');
        return lsPatch(id, patch);
    }
}

/**
 * DELETE /livres/:id - Supprime un livre
 * @param {number} id - ID du livre à supprimer
 * @returns {boolean} true si supprimé, false sinon
 */
async function apiDelete(id) {
    try {
        if (useLocalStorage) {
            lsDelete(id);
            showToast('success', 'Livre supprimé avec succès');
            return true;
        }
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        showToast('success', 'Livre supprimé avec succès');
        return true;
    } catch (error) {
        console.error('[API DELETE] Erreur:', error);
        showToast('error', 'Erreur lors de la suppression');
        return false;
    }
}


// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

/**
 * Charge tous les livres depuis l'API et met à jour l'affichage
 */
async function loadBooks() {
    books = await apiGetAll();
    renderBooks();
    updateStats();
}


// ============================================================
// PAGE D'ACCUEIL - AFFICHAGE DES LIVRES
// ============================================================

/**
 * Affiche la grille des livres
 * @param {Array|null} filtered - Liste filtrée (optionnel)
 */
function renderBooks(filtered = null) {
    const grid = document.getElementById('booksGrid');
    const data = filtered || books;

    // Met à jour le compteur
    document.getElementById('booksCount').textContent = 
        data.length + ' livre' + (data.length > 1 ? 's' : '') + ' disponible' + (data.length > 1 ? 's' : '');

    // Affiche un message si aucun livre
    if (data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Aucun livre trouvé</p>
            </div>
        `;
        return;
    }

    // Génère les cartes de livres
    grid.innerHTML = data.map(book => `
        <div class="book-card" onclick="openBookModal(${book.id})">
            <img class="book-cover" src="${book.couverture}" 
                 alt="${book.titre}" 
                 onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
            <div class="book-info">
                <div class="book-title">${book.titre}</div>
                <div class="book-author">${book.auteur}</div>
                <span class="book-genre-tag tag-${book.genre.replace('-', '')}">${book.genre}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Filtre les livres par genre
 * @param {string} category - Genre à filtrer ('all' pour tout)
 */
function filterCategory(category) {
    currentFilter = category;

    // Met à jour l'apparence des boutons de catégorie
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.closest('.category-chip').classList.add('active');

    // Applique le filtre
    if (category === 'all') {
        renderBooks();
    } else {
        renderBooks(books.filter(b => b.genre === category));
    }
}

/**
 * Recherche en temps réel dans les livres
 * Filtre par titre, auteur ou genre
 */
function searchBooks() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = books.filter(b => 
        b.titre.toLowerCase().includes(query) || 
        b.auteur.toLowerCase().includes(query) ||
        b.genre.toLowerCase().includes(query)
    );
    renderBooks(filtered);
}

/**
 * Défilement vers la section des livres
 */
function scrollToBooks() {
    document.getElementById('booksSection').scrollIntoView({ behavior: 'smooth' });
}


// ============================================================
// MODALE DE DÉTAILS D'UN LIVRE
// ============================================================

/**
 * Ouvre la modale avec les détails d'un livre
 * @param {number} id - ID du livre
 */
async function openBookModal(id) {
    // Récupère les données fraîches depuis l'API
    const book = await apiGetById(id);
    if (!book) return;

    currentBook = book;

    // Remplit la modale avec les données
    document.getElementById('modalImage').src = book.couverture;
    document.getElementById('modalTitle').textContent = book.titre;
    document.getElementById('modalAuthor').textContent = book.auteur;
    document.getElementById('modalDesc').textContent = book.description;
    document.getElementById('modalGenre').textContent = 
        book.genre.charAt(0).toUpperCase() + book.genre.slice(1);
    document.getElementById('modalYear').textContent = book.annee;
    document.getElementById('modalPages').textContent = book.pages;
    document.getElementById('modalRating').textContent = '★ ' + book.note;

    // Configure le bouton selon le statut "À lire"
    const btn = document.getElementById('modalAddBtn');
    if (book.aLire) {
        btn.innerHTML = '<i class="fas fa-check"></i> Retirer de ma liste';
        btn.className = 'btn btn-danger';
        btn.onclick = () => removeFromReading(book.id);
    } else {
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Ajouter à ma liste';
        btn.className = 'btn btn-primary';
        btn.onclick = () => addToReading(book.id);
    }

    // Affiche la modale
    document.getElementById('bookModal').classList.add('active');
}

/**
 * Ferme une modale
 * @param {string} id - ID de l'élément modale
 */
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    editingBookId = null;
}


// ============================================================
// LISTE "À LIRE" (PATCH aLire)
// ============================================================

/**
 * Ajoute un livre à la liste "À lire"
 * PATCH /livres/:id { aLire: true }
 * @param {number} id - ID du livre
 */
async function addToReading(id) {
    const updated = await apiPatch(id, { aLire: true });
    if (!updated) return;

    // Met à jour la liste locale
    books = books.map(b => b.id === id ? updated : b);

    closeModal('bookModal');
    updateStats();
    showToast('success', '"' + updated.titre + '" ajouté à votre liste !');
}

/**
 * Retire un livre de la liste "À lire"
 * PATCH /livres/:id { aLire: false }
 * @param {number} id - ID du livre
 */
async function removeFromReading(id) {
    const updated = await apiPatch(id, { aLire: false });
    if (!updated) return;

    books = books.map(b => b.id === id ? updated : b);

    closeModal('bookModal');
    renderReadingList();
    updateStats();
    showToast('success', 'Livre retiré de votre liste');
}

/**
 * Affiche la liste des livres "À lire"
 */
async function renderReadingList() {
    const container = document.getElementById('readingList');
    const count = document.getElementById('readingCount');

    // Recharge les données fraîches depuis l'API
    books = await apiGetAll();
    const readingBooks = books.filter(b => b.aLire);

    count.textContent = readingBooks.length;

    // Message si la liste est vide
    if (readingBooks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fas fa-book-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Votre liste de lecture est vide</p>
                <button class="btn btn-primary btn-sm" style="margin-top: 16px;" 
                        onclick="navigateTo('home')">
                    Découvrir des livres
                </button>
            </div>
        `;
        return;
    }

    // Affiche les livres "À lire"
    container.innerHTML = readingBooks.map(book => `
        <div class="reading-item">
            <img class="reading-thumb" src="${book.couverture}" 
                 alt="${book.titre}" 
                 onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
            <div class="reading-details">
                <div class="reading-title">${book.titre}</div>
                <div class="reading-author">${book.auteur}</div>
            </div>
            <div class="reading-meta">
                <span class="reading-status status-toread">À lire</span>
            </div>
            <div class="reading-actions">
                <button class="icon-btn" onclick="deleteFromReading(${book.id})" title="Retirer">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Retire un livre de la liste (depuis la page "Ma liste")
 * @param {number} id - ID du livre
 */
async function deleteFromReading(id) {
    const updated = await apiPatch(id, { aLire: false });
    if (!updated) return;

    books = books.map(b => b.id === id ? updated : b);
    renderReadingList();
    updateStats();
    showToast('success', 'Livre retiré de votre liste');
}


// ============================================================
// PAGE ADMIN - TABLEAU DE BORD
// ============================================================

/**
 * Affiche le tableau des livres dans l'admin
 */
async function renderAdminTable() {
    // Recharge les données fraîches
    books = await apiGetAll();
    const tbody = document.getElementById('adminTableBody');

    tbody.innerHTML = books.map(book => `
        <tr>
            <td>
                <div class="table-book">
                    <img src="${book.couverture}" alt="${book.titre}" 
                         onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
                    <div class="table-book-info">
                        <span class="table-book-title">${book.titre}</span>
                        <span class="table-book-author">${book.auteur}</span>
                    </div>
                </div>
            </td>
            <td>${book.auteur}</td>
            <td>
                <span class="badge" style="background: rgba(124,58,237,0.15); color: var(--accent-light);">
                    ${book.genre}
                </span>
            </td>
            <td>
                <span class="badge" style="background: rgba(16,185,129,0.15); color: var(--success);">
                    <i class="fas fa-check" style="font-size: 10px; margin-right: 4px;"></i>Publié
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="icon-btn" onclick="openEditModal(${book.id})" title="Modifier">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="icon-btn" onclick="deleteBook(${book.id})" 
                            title="Supprimer" style="color: var(--danger);">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Met à jour les statistiques du tableau de bord
 */
function updateStats() {
    document.getElementById('statTotal').textContent = books.length;
    document.getElementById('statReading').textContent = books.filter(b => b.aLire).length;
    document.getElementById('statToRead').textContent = books.filter(b => !b.aLire).length;
    document.getElementById('statFinished').textContent = '0';
}

/**
 * Supprime un livre (Admin)
 * @param {number} id - ID du livre
 */
async function deleteBook(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;

    const success = await apiDelete(id);
    if (!success) return;

    books = books.filter(b => b.id !== id);
    renderBooks();
    renderAdminTable();
    updateStats();
}


// ============================================================
// AJOUTER / MODIFIER UN LIVRE (CRUD)
// ============================================================

/**
 * Ouvre la modale pour ajouter un nouveau livre
 */
function openAddModal() {
    editingBookId = null;

    // Configure les titres de la modale
    document.getElementById('modalTitleForm').textContent = 'Ajouter un livre';
    document.getElementById('modalSubtitleForm').textContent = 
        'Remplissez les informations du nouveau livre';
    document.getElementById('submitBtn').textContent = 'Ajouter le livre';

    // Réinitialise le formulaire
    document.getElementById('addBookForm').reset();

    // Affiche la modale
    document.getElementById('addModal').classList.add('active');
}

/**
 * Ouvre la modale pour modifier un livre existant
 * @param {number} id - ID du livre à modifier
 */
async function openEditModal(id) {
    const book = await apiGetById(id);
    if (!book) return;

    editingBookId = id;

    // Configure les titres
    document.getElementById('modalTitleForm').textContent = 'Modifier le livre';
    document.getElementById('modalSubtitleForm').textContent = 
        'Modifiez les informations du livre';
    document.getElementById('submitBtn').textContent = 'Modifier le livre';

    // Pré-remplit le formulaire
    document.getElementById('addTitle').value = book.titre;
    document.getElementById('addAuthor').value = book.auteur;
    document.getElementById('addGenre').value = book.genre;
    document.getElementById('addYear').value = book.annee;
    document.getElementById('addPages').value = book.pages;
    document.getElementById('addRating').value = book.note;
    document.getElementById('addDesc').value = book.description;
    document.getElementById('addImage').value = book.couverture;

    document.getElementById('addModal').classList.add('active');
}

/**
 * Soumet le formulaire (Ajout ou Modification)
 * @param {Event} e - Événement du formulaire
 */
async function submitAddBook(e) {
    e.preventDefault();

    const genre = document.getElementById('addGenre').value;

    // Images par défaut selon le genre
    const genreImages = {
        'science-fiction': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
        'fantasy': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
        'classique': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
        'drame': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        'philosophie': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80'
    };

    // Construit l'objet livre
    const bookData = {
        titre: document.getElementById('addTitle').value,
        auteur: document.getElementById('addAuthor').value,
        genre: genre,
        annee: parseInt(document.getElementById('addYear').value),
        pages: parseInt(document.getElementById('addPages').value),
        note: parseFloat(document.getElementById('addRating').value),
        description: document.getElementById('addDesc').value,
        couverture: document.getElementById('addImage').value || 
                    genreImages[genre] || 
                    'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
        aLire: false
    };

    // Appelle l'API (POST ou PUT selon le contexte)
    let result;
    if (editingBookId) {
        result = await apiUpdate(editingBookId, bookData);
    } else {
        result = await apiCreate(bookData);
    }

    if (!result) return;

    // Réinitialise et ferme la modale
    document.getElementById('addBookForm').reset();
    closeModal('addModal');
    editingBookId = null;

    // Recharge les données
    await loadBooks();
    renderAdminTable();
    updateStats();
}


// ============================================================
// NOTIFICATIONS (TOAST)
// ============================================================

/**
 * Affiche une notification toast
 * @param {string} type - Type: 'success', 'error', 'info'
 * @param {string} message - Message à afficher
 */
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');

    const icons = {
        success: 'fa-check',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    const titles = {
        success: 'Succès',
        error: 'Erreur',
        info: 'Information'
    };

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type]}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Disparition automatique après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}