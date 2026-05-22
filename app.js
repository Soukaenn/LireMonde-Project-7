// ===== DATA INITIAL (depuis data.json embarqué) =====
const INITIAL_DATA = {
  "livres": [
    {
      "id": 1,
      "titre": "Dune",
      "auteur": "Frank Herbert",
      "genre": "science-fiction",
      "annee": 1965,
      "pages": 412,
      "note": 4.8,
      "couverture": "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80",
      "description": "Dans un futur lointain, l'univers est régi par un impérium galactique où le contrôle de la planète désertique Arrakis, seule source de l'épice la plus précieuse de l'univers, détermine le destin de l'humanité. Paul Atréides, jeune héritier d'une noble famille, doit survivre aux intrigues politiques et découvrir son destin parmi les Fremen du désert.",
      "aLire": false
    },
    {
      "id": 2,
      "titre": "1984",
      "auteur": "George Orwell",
      "genre": "science-fiction",
      "annee": 1949,
      "pages": 328,
      "note": 4.7,
      "couverture": "https://images.unsplash.com/photo-1629196914375-f7e48f477b6d?w=400&q=80",
      "description": "Winston Smith vit sous la surveillance constante du Parti dans une Londres dystopique de l'année 1984. Le Big Brother veille sur chaque citoyen, réécrit l'histoire et élimine toute pensée dissidente. La rébellion de Winston contre ce régime totalitaire mènera à une conclusion aussi inévitable que dévastatrice.",
      "aLire": false
    },
    {
      "id": 3,
      "titre": "Le Comte de Monte-Cristo",
      "auteur": "Alexandre Dumas",
      "genre": "classique",
      "annee": 1844,
      "pages": 1276,
      "note": 4.9,
      "couverture": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
      "description": "Edmond Dantès, jeune marin marseillais, est injustement accusé de bonapartisme et emprisonné au château d'If. Après quatorze années de détention, il s'évade et découvre un trésor sur l'île de Monte-Cristo. Devenu richissime, il entame une méticuleuse vengeance contre ceux qui l'ont trahi.",
      "aLire": false
    },
    {
      "id": 4,
      "titre": "L'Étranger",
      "auteur": "Albert Camus",
      "genre": "philosophie",
      "annee": 1942,
      "pages": 185,
      "note": 4.5,
      "couverture": "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80",
      "description": "Meursault, un employé d'Algérois, apprend la mort de sa mère en maison de retraite. Il assiste à l'enterrement sans manifester la douleur attendue. Quelques jours plus tard, il tue un Arabe sur une plage, pour des raisons liées au soleil. Son procès devient moins une accusation pour meurtre qu'un jugement de son indifférence face au monde.",
      "aLire": false
    },
    {
      "id": 5,
      "titre": "Crime et Châtiment",
      "auteur": "Fiodor Dostoïevski",
      "genre": "drame",
      "annee": 1866,
      "pages": 592,
      "note": 4.8,
      "couverture": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80",
      "description": "Rodion Raskolnikov, un ancien étudiant de Saint-Pétersbourg, vivant dans la misère, décide de tuer une vieille usurière qu'il juge nuisible à la société. Après le meurtre, il est rongé par la culpabilité et la folie, tandis que l'inspecteur Porfiry Petrovič mène son enquête avec une perspicacité redoutable.",
      "aLire": false
    },
    {
      "id": 6,
      "titre": "Le Seigneur des Anneaux",
      "auteur": "J.R.R. Tolkien",
      "genre": "fantasy",
      "annee": 1954,
      "pages": 1216,
      "note": 4.9,
      "couverture": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
      "description": "Frodon Sacquet hérite d'un anneau magique de son oncle Bilbon. Gandalf le révèle être l'Anneau Unique, forgé par Sauron pour dominer la Terre du Milieu. Frodon doit entreprendre un périlleux voyage jusqu'à la Montagne du Destin pour détruire l'anneau, accompagné de la Communauté de l'Anneau.",
      "aLire": false
    }
  ]
};

// ===== STORAGE (localStorage) =====
const STORAGE_KEY = 'liremonde_books';

function storageGetAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        // Premier lancement: charger les données initiales
        const initial = INITIAL_DATA.livres;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    }
    return JSON.parse(raw);
}

function storageSave(books) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function storageGetById(id) {
    return storageGetAll().find(b => b.id === id) || null;
}

function storageCreate(book) {
    const all = storageGetAll();
    const newId = all.length > 0 ? Math.max(...all.map(b => b.id)) + 1 : 1;
    const newBook = { ...book, id: newId };
    all.push(newBook);
    storageSave(all);
    return newBook;
}

function storageUpdate(id, book) {
    const all = storageGetAll();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...book, id };
    storageSave(all);
    return all[idx];
}

function storageDelete(id) {
    const all = storageGetAll().filter(b => b.id !== id);
    storageSave(all);
    return true;
}

function storagePatch(id, patch) {
    const all = storageGetAll();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    storageSave(all);
    return all[idx];
}

// ===== STATE =====
let books = [];
let currentBook = null;
let currentFilter = 'all';
let editingBookId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    loadBooks();
    setupEventListeners();
});

// ===== ROUTING (SPA) =====
function handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';

    document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));

    const targetPage = document.getElementById('page-' + hash);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    } else {
        document.getElementById('page-home').classList.remove('hidden');
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('href') === '#' + hash) {
            a.classList.add('active');
        }
    });

    const fab = document.getElementById('fabBtn');
    if (hash === 'admin' || hash === 'reading') {
        fab.classList.add('hidden');
    } else {
        fab.classList.remove('hidden');
    }

    if (hash === 'reading') {
        renderReadingList();
    } else if (hash === 'admin') {
        renderAdminTable();
        updateStats();
    } else if (hash === 'home') {
        renderBooks();
    }

    window.scrollTo(0, 0);
}

function navigateTo(page) {
    window.location.hash = page;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
    });
}

// ===== LOAD BOOKS =====
function loadBooks() {
    books = storageGetAll();
    renderBooks();
    updateStats();
}

// ===== NAVIGATION HELPERS =====
function showPage(page) {
    navigateTo(page);
}

function scrollToBooks() {
    document.getElementById('booksSection').scrollIntoView({ behavior: 'smooth' });
}

// ===== RENDER BOOKS =====
function renderBooks(filtered = null) {
    const grid = document.getElementById('booksGrid');
    const data = filtered || books;

    document.getElementById('booksCount').textContent = data.length + ' livre' + (data.length > 1 ? 's' : '') + ' disponible' + (data.length > 1 ? 's' : '');

    if (data.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Aucun livre trouvé</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = data.map(book => `
        <div class="book-card" onclick="openBookModal(${book.id})">
            <img class="book-cover" src="${book.couverture}" alt="${book.titre}" onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
            <div class="book-info">
                <div class="book-title">${book.titre}</div>
                <div class="book-author">${book.auteur}</div>
                <span class="book-genre-tag tag-${book.genre.replace('-', '')}">${book.genre}</span>
            </div>
        </div>
    `).join('');
}

// ===== CATEGORY FILTER =====
function filterCategory(category) {
    currentFilter = category;

    document.querySelectorAll('.category-chip').forEach(chip => chip.classList.remove('active'));
    event.target.closest('.category-chip').classList.add('active');

    if (category === 'all') {
        renderBooks();
    } else {
        renderBooks(books.filter(b => b.genre === category));
    }
}

// ===== SEARCH =====
function searchBooks() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = books.filter(b =>
        b.titre.toLowerCase().includes(query) ||
        b.auteur.toLowerCase().includes(query) ||
        b.genre.toLowerCase().includes(query)
    );
    renderBooks(filtered);
}

// ===== BOOK MODAL =====
function openBookModal(id) {
    const book = storageGetById(id);
    if (!book) return;

    currentBook = book;
    document.getElementById('modalImage').src = book.couverture;
    document.getElementById('modalTitle').textContent = book.titre;
    document.getElementById('modalAuthor').textContent = book.auteur;
    document.getElementById('modalDesc').textContent = book.description;
    document.getElementById('modalGenre').textContent = book.genre.charAt(0).toUpperCase() + book.genre.slice(1);
    document.getElementById('modalYear').textContent = book.annee;
    document.getElementById('modalPages').textContent = book.pages;
    document.getElementById('modalRating').textContent = '★ ' + book.note;

    const btn = document.getElementById('modalAddBtn');
    if (book.aLire) {
        btn.innerHTML = '<i class="fas fa-check"></i> Dans ma liste';
        btn.onclick = () => removeFromReading(book.id);
        btn.className = 'btn btn-success';
    } else {
        btn.innerHTML = '<i class="fas fa-bookmark"></i> Ajouter à ma liste';
        btn.onclick = () => addToReading(book.id);
        btn.className = 'btn btn-primary';
    }

    document.getElementById('bookModal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    editingBookId = null;
}

// ===== READING LIST =====
function addToReading(id) {
    const updated = storagePatch(id, { aLire: true });
    if (!updated) return;

    books = storageGetAll();
    closeModal('bookModal');
    updateStats();
    showToast('success', '"' + updated.titre + '" ajouté à votre liste !');
}

function removeFromReading(id) {
    const updated = storagePatch(id, { aLire: false });
    if (!updated) return;

    books = storageGetAll();
    closeModal('bookModal');
    renderReadingList();
    updateStats();
    showToast('success', 'Livre retiré de votre liste');
}

function renderReadingList() {
    const container = document.getElementById('readingList');
    const count = document.getElementById('readingCount');

    books = storageGetAll();
    const readingBooks = books.filter(b => b.aLire);

    count.textContent = readingBooks.length;

    if (readingBooks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <i class="fas fa-book-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Votre liste de lecture est vide</p>
                <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="navigateTo('home')">
                    Découvrir des livres
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = readingBooks.map(book => `
        <div class="reading-item">
            <img class="reading-thumb" src="${book.couverture}" alt="${book.titre}" onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
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

function deleteFromReading(id) {
    const updated = storagePatch(id, { aLire: false });
    if (!updated) return;

    books = storageGetAll();
    renderReadingList();
    updateStats();
    showToast('success', 'Livre retiré de votre liste');
}

// ===== ADMIN =====
function renderAdminTable() {
    books = storageGetAll();
    const tbody = document.getElementById('adminTableBody');

    tbody.innerHTML = books.map(book => `
        <tr>
            <td>
                <div class="table-book">
                    <img src="${book.couverture}" alt="${book.titre}" onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'">
                    <div class="table-book-info">
                        <span class="table-book-title">${book.titre}</span>
                        <span class="table-book-author">${book.auteur}</span>
                    </div>
                </div>
            </td>
            <td>${book.auteur}</td>
            <td><span class="badge" style="background: rgba(124,58,237,0.15); color: var(--accent-light);">${book.genre}</span></td>
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
                    <button class="icon-btn" onclick="deleteBook(${book.id})" title="Supprimer" style="color: var(--danger);">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    document.getElementById('statTotal').textContent = books.length;
    document.getElementById('statReading').textContent = books.filter(b => b.aLire).length;
    document.getElementById('statToRead').textContent = books.filter(b => !b.aLire).length;
    document.getElementById('statFinished').textContent = '0';
}

function deleteBook(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;

    storageDelete(id);
    books = storageGetAll();
    renderBooks();
    renderAdminTable();
    updateStats();
    showToast('success', 'Livre supprimé avec succès');
}

// ===== ADD / EDIT BOOK =====
function openAddModal() {
    editingBookId = null;
    document.getElementById('modalTitleForm').textContent = 'Ajouter un livre';
    document.getElementById('modalSubtitleForm').textContent = 'Remplissez les informations du nouveau livre';
    document.getElementById('submitBtn').textContent = 'Ajouter le livre';
    document.getElementById('addBookForm').reset();
    document.getElementById('addModal').classList.add('active');
}

function openEditModal(id) {
    const book = storageGetById(id);
    if (!book) return;

    editingBookId = id;
    document.getElementById('modalTitleForm').textContent = 'Modifier le livre';
    document.getElementById('modalSubtitleForm').textContent = 'Modifiez les informations du livre';
    document.getElementById('submitBtn').textContent = 'Modifier le livre';

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

function submitAddBook(e) {
    e.preventDefault();

    const genre = document.getElementById('addGenre').value;
    const genreImages = {
        'science-fiction': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80',
        'fantasy': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
        'classique': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
        'drame': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        'philosophie': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80'
    };

    const bookData = {
        titre: document.getElementById('addTitle').value,
        auteur: document.getElementById('addAuthor').value,
        genre: genre,
        annee: parseInt(document.getElementById('addYear').value),
        pages: parseInt(document.getElementById('addPages').value),
        note: parseFloat(document.getElementById('addRating').value),
        description: document.getElementById('addDesc').value,
        couverture: document.getElementById('addImage').value || genreImages[genre] || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
        aLire: false
    };

    let result;
    if (editingBookId) {
        result = storageUpdate(editingBookId, bookData);
        if (result) showToast('success', `"${result.titre}" modifié avec succès !`);
    } else {
        result = storageCreate(bookData);
        if (result) showToast('success', `"${result.titre}" ajouté avec succès !`);
    }

    if (!result) {
        showToast('error', 'Erreur lors de la sauvegarde');
        return;
    }

    document.getElementById('addBookForm').reset();
    closeModal('addModal');
    editingBookId = null;

    books = storageGetAll();
    renderBooks();
    renderAdminTable();
    updateStats();
}

// ===== TOAST =====
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

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}