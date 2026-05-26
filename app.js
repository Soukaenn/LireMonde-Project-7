// ========== CONFIGURATION ==========
const API_URL = 'http://localhost:3000/livres';

// ========== ÉTAT GLOBAL ==========
let tousLesLivres = [];        // Tous les livres de l'API
let livresFiltres = [];        // Livres après filtrage/recherche
let pageActive = 'accueil';    // Page actuelle
let livreEnEdition = null;     // Livre en cours d'édition

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    chargerLivres();

    // Fermer les modales en cliquant à l'extérieur
    document.getElementById('modale').addEventListener('click', (e) => {
        if (e.target.id === 'modale') fermerModale();
    });

    document.getElementById('formulaire-modale').addEventListener('click', (e) => {
        if (e.target.id === 'formulaire-modale') fermerFormulaire();
    });
});

// ========== API - FETCH ==========

// Récupérer tous les livres
async function chargerLivres() {
    try {
        const reponse = await fetch(API_URL);
        if (!reponse.ok) throw new Error('Erreur lors du chargement');

        tousLesLivres = await reponse.json();
        livresFiltres = [...tousLesLivres];

        afficherLivres();
        genererFiltres();
        mettreAJourCompteur();
        afficherTableauAdmin();
        afficherListeALire();

    } catch (erreur) {
        console.error('Erreur:', erreur);
        afficherErreur('Impossible de charger les livres. Vérifiez que le serveur JSON est lancé (npx json-server --watch db.json --port 3000)');
    }
}

// Récupérer un livre par ID
async function getLivreParId(id) {
    try {
        const reponse = await fetch(`${API_URL}/${id}`);
        if (!reponse.ok) throw new Error('Livre non trouvé');
        return await reponse.json();
    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur lors de la récupération du livre');
    }
}

// Ajouter un livre (POST)
async function ajouterLivre(livre) {
    try {
        const reponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(livre)
        });
        if (!reponse.ok) throw new Error('Erreur lors de l\'ajout');
        return await reponse.json();
    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur lors de l\'ajout du livre');
    }
}

// Modifier un livre (PUT)
async function modifierLivre(id, livre) {
    try {
        const reponse = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(livre)
        });
        if (!reponse.ok) throw new Error('Erreur lors de la modification');
        return await reponse.json();
    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur lors de la modification du livre');
    }
}

// Supprimer un livre (DELETE)
async function supprimerLivre(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;

    try {
        const reponse = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!reponse.ok) throw new Error('Erreur lors de la suppression');

        // Recharger les données
        await chargerLivres();

    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur lors de la suppression du livre');
    }
}

// Basculer "À lire" (PATCH)
async function basculerALire(id, etatActuel) {
    try {
        const reponse = await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aLire: !etatActuel })
        });
        if (!reponse.ok) throw new Error('Erreur lors de la mise à jour');

        // Mettre à jour localement sans recharger la page active
        const livre = tousLesLivres.find(l => l.id == id);
        if (livre) livre.aLire = !etatActuel;

        // Rafraîchir seulement les composants nécessaires
        afficherLivres();
        genererFiltres();
        mettreAJourCompteur();
        afficherTableauAdmin();
        if (pageActive === 'alire') {
            afficherListeALire();
        }

    } catch (erreur) {
        console.error('Erreur:', erreur);
        alert('Erreur lors de la mise à jour');
    }
}

// ========== AFFICHAGE ==========

// Afficher les livres dans la grille
function afficherLivres() {
    const conteneur = document.getElementById('grille-livres');

    if (livresFiltres.length === 0) {
        conteneur.innerHTML = '<div class="message-vide">Aucun livre ne correspond à votre recherche.</div>';
        return;
    }

    conteneur.innerHTML = livresFiltres.map(livre => `
        <div class="carte-livre" onclick="ouvrirModale(${livre.id})">
            ${livre.aLire ? '<span class="badge-alire">📋 À lire</span>' : ''}
            <img src="${livre.couverture}" alt="${livre.titre}" onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'">
            <div class="info-livre">
                <div class="titre-livre">${livre.titre}</div>
                <div class="auteur-livre">✍️ ${livre.auteur}</div>
                <span class="genre-livre">${livre.genre}</span>
            </div>
        </div>
    `).join('');
}

// Générer les boutons de filtre par genre
function genererFiltres() {
    // Extraire les genres uniques
    const genres = [...new Set(tousLesLivres.map(l => l.genre))];
    const conteneur = document.getElementById('filtres-genres');

    conteneur.innerHTML = genres.map(genre => `
        <button onclick="filtrerParGenre('${genre}')" class="filtre-btn" data-genre="${genre}">${genre}</button>
    `).join('');
}

// Afficher la liste "À lire"
function afficherListeALire() {
    const livresALire = tousLesLivres.filter(l => l.aLire);
    const conteneur = document.getElementById('liste-alire');
    const messageVide = document.getElementById('vide-alire');

    if (livresALire.length === 0) {
        conteneur.innerHTML = '';
        messageVide.style.display = 'block';
        return;
    }

    messageVide.style.display = 'none';
    conteneur.innerHTML = livresALire.map(livre => `
        <div class="carte-livre" onclick="ouvrirModale(${livre.id})">
            <span class="badge-alire">📋 À lire</span>
            <img src="${livre.couverture}" alt="${livre.titre}" onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'">
            <div class="info-livre">
                <div class="titre-livre">${livre.titre}</div>
                <div class="auteur-livre">✍️ ${livre.auteur}</div>
                <button onclick="event.stopPropagation(); basculerALire(${livre.id}, true)" class="btn-alire btn-retirer-alire">❌ Retirer</button>
            </div>
        </div>
    `).join('');
}

// Afficher le tableau admin
function afficherTableauAdmin() {
    const tbody = document.getElementById('tbody-admin');

    tbody.innerHTML = tousLesLivres.map(livre => `
        <tr>
            <td>${livre.id}</td>
            <td><img src="${livre.couverture}" class="img-table" onerror="this.src='https://via.placeholder.com/50x70?text=?'"></td>
            <td>${livre.titre}</td>
            <td>${livre.auteur}</td>
            <td><span class="genre-livre">${livre.genre}</span></td>
            <td>
                <button onclick="editerLivre('${livre.id}')" class="btn-modifier">✏️ Modifier</button>
                <button onclick="supprimerLivre(${livre.id})" class="btn-supprimer">🗑️ Supprimer</button>
            </td>
        </tr>
    `).join('');
}

// Mettre à jour le compteur "À lire"
function mettreAJourCompteur() {
    const compteur = tousLesLivres.filter(l => l.aLire).length;
    document.getElementById('compteur-alire').textContent = `(${compteur})`;
}

// ========== NAVIGATION ==========

function afficherPage(page) {
    // Cacher toutes les pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Afficher la page demandée
    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById(`btn-${page}`).classList.add('active');

    pageActive = page;

    // Rafraîchir les données si nécessaire
    if (page === 'alire') afficherListeALire();
    if (page === 'admin') afficherTableauAdmin();
}

// ========== FILTRAGE & RECHERCHE ==========

function filtrerParGenre(genre) {
    // Mettre à jour les boutons actifs
    document.querySelectorAll('.filtre-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.genre === genre);
    });

    // Filtrer les livres
    if (genre === 'tous') {
        livresFiltres = [...tousLesLivres];
    } else {
        livresFiltres = tousLesLivres.filter(l => l.genre === genre);
    }

    // Réappliquer la recherche si active
    const recherche = document.getElementById('recherche-globale').value.toLowerCase();
    if (recherche) {
        livresFiltres = livresFiltres.filter(l => 
            l.titre.toLowerCase().includes(recherche) || 
            l.auteur.toLowerCase().includes(recherche)
        );
    }

    afficherLivres();
}

function rechercherLivres(motCle) {
    const recherche = motCle.toLowerCase();

    // Partir des livres filtrés par genre ou tous
    const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';
    let base = genreActif === 'tous' ? [...tousLesLivres] : tousLesLivres.filter(l => l.genre === genreActif);

    // Appliquer la recherche
    livresFiltres = base.filter(l => 
        l.titre.toLowerCase().includes(recherche) || 
        l.auteur.toLowerCase().includes(recherche) ||
        l.genre.toLowerCase().includes(recherche)
    );

    afficherLivres();
}

// ========== MODALE DÉTAILS ==========

async function ouvrirModale(id) {
    const livre = await getLivreParId(id);
    if (!livre) return;

    const modaleBody = document.getElementById('modale-body');
    const estALire = livre.aLire;

    modaleBody.innerHTML = `
        <img src="${livre.couverture}" class="modale-image" onerror="this.src='https://via.placeholder.com/600x300?text=Pas+d%27image'">
        <h2 class="modale-titre">${livre.titre}</h2>
        <p class="modale-auteur">✍️ ${livre.auteur} | 🏷️ ${livre.genre}</p>
        <p class="modale-description">${livre.description}</p>
        <button onclick="basculerALire(${livre.id}, ${estALire}); fermerModale();" 
                class="btn-alire ${estALire ? 'btn-retirer-alire' : 'btn-ajouter-alire'}">
            ${estALire ? '❌ Retirer de la liste' : '➕ Ajouter à la liste'}
        </button>
    `;

    document.getElementById('modale').classList.add('active');
}

function fermerModale() {
    document.getElementById('modale').classList.remove('active');
}

// ========== FORMULAIRE ADMIN ==========

function ouvrirFormulaire() {
    livreEnEdition = null;
    document.getElementById('titre-formulaire').textContent = 'Ajouter un Livre';
    document.getElementById('form-livre').reset();
    document.getElementById('livre-id').value = '';
    document.getElementById('formulaire-modale').classList.add('active');
}

// BUG FIX: Utiliser == au lieu de === car json-server retourne les IDs en string
function editerLivre(id) {
    const livre = tousLesLivres.find(l => l.id == id);
    if (!livre) {
        console.error('Livre non trouvé avec ID:', id);
        alert('Erreur: Livre non trouvé');
        return;
    }

    livreEnEdition = id;
    document.getElementById('titre-formulaire').textContent = 'Modifier le Livre';
    document.getElementById('livre-id').value = livre.id;
    document.getElementById('form-titre').value = livre.titre;
    document.getElementById('form-auteur').value = livre.auteur;
    document.getElementById('form-genre').value = livre.genre;
    document.getElementById('form-description').value = livre.description;
    document.getElementById('form-couverture').value = livre.couverture;

    document.getElementById('formulaire-modale').classList.add('active');
}

function fermerFormulaire() {
    document.getElementById('formulaire-modale').classList.remove('active');
}

async function sauvegarderLivre(event) {
    event.preventDefault();

    const livre = {
        titre: document.getElementById('form-titre').value,
        auteur: document.getElementById('form-auteur').value,
        genre: document.getElementById('form-genre').value,
        description: document.getElementById('form-description').value,
        couverture: document.getElementById('form-couverture').value,
        aLire: false
    };

    if (livreEnEdition) {
        // Modifier (on garde l'état aLire existant)
        const ancien = tousLesLivres.find(l => l.id == livreEnEdition);
        livre.aLire = ancien ? ancien.aLire : false;
        livre.id = livreEnEdition;
        await modifierLivre(livreEnEdition, livre);
    } else {
        // Ajouter
        await ajouterLivre(livre);
    }

    fermerFormulaire();
    await chargerLivres();
}

// ========== UTILITAIRES ==========

function afficherErreur(message) {
    const conteneur = document.getElementById('grille-livres');
    conteneur.innerHTML = `<div class="erreur-message">⚠️ ${message}</div>`;
}