// URL de l'API
const API_URL = 'http://localhost:3000/livres';

// Variables globales
let tousLesLivres = [];
let livresFiltres = [];
let pageActive = 'accueil';
let livreEnEdition = null;

// Au demarrage de la page
document.addEventListener('DOMContentLoaded', () => {
    chargerLivres();

    // Fermer modale si on clique dehors
    document.getElementById('modale').addEventListener('click', (e) => {
        if (e.target.id === 'modale') fermerModale();
    });

    document.getElementById('formulaire-modale').addEventListener('click', (e) => {
        if (e.target.id === 'formulaire-modale') fermerFormulaire();
    });
});

// ========== CHARGER LES LIVRES ==========
async function chargerLivres() {
    try {
        const reponse = await fetch(API_URL);
        tousLesLivres = await reponse.json();
        
        // Sauvegarder les filtres actifs avant rechargement
        const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';
        const recherche = document.getElementById('recherche-globale').value.toLowerCase();
        
        // Réappliquer le filtre de genre
        if (genreActif === 'tous') {
            livresFiltres = [...tousLesLivres];
        } else {
            livresFiltres = tousLesLivres.filter(l => l.genre === genreActif);
        }
        
        // Réappliquer la recherche si active
        if (recherche) {
            livresFiltres = livresFiltres.filter(l => 
                l.titre.toLowerCase().includes(recherche) || 
                l.auteur.toLowerCase().includes(recherche)
            );
        }

        afficherLivres();
        genererFiltres();
        
        // Restaurer le bouton de filtre actif
        if (genreActif !== 'tous') {
            const btn = document.querySelector(`.filtre-btn[data-genre="${genreActif}"]`);
            if (btn) btn.classList.add('active');
            else document.querySelector('.filtre-btn[data-genre="tous"]')?.classList.add('active');
        } else {
            document.querySelector('.filtre-btn[data-genre="tous"]')?.classList.add('active');
        }
        
        mettreAJourCompteur();
        afficherTableauAdmin();
        if (pageActive === 'alire') afficherListeALire();
    } catch (erreur) {
        document.getElementById('grille-livres').innerHTML = 
            '<div class="message-vide">⚠️ Lance le serveur: npx json-server --watch db.json --port 3000</div>';
    }
}

// ========== AJOUTER / MODIFIER / SUPPRIMER ==========

async function ajouterLivre(livre) {
    delete livre.id; 
    await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(livre)
    });
    await chargerLivres();
}

async function modifierLivre(id, livre) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(livre)
    });
}

async function supprimerLivre(id) {
    if (!confirm('Supprimer ce livre ?')) return;
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    await chargerLivres();
}

async function basculerALire(id, etatActuel) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aLire: !etatActuel })
    });

    // Recharger depuis le serveur en preservant les filtres actifs
    await chargerLivres();
}

// ========== AFFICHAGE ==========

function afficherLivres() {
    const conteneur = document.getElementById('grille-livres');

    if (livresFiltres.length === 0) {
        conteneur.innerHTML = '<div class="message-vide">Aucun livre trouve.</div>';
        return;
    }

    conteneur.innerHTML = livresFiltres.map(livre => `
        <div class="carte-livre" onclick="ouvrirModale('${livre.id}')">
            ${livre.aLire ? '<span class="badge-alire">📋 A lire</span>' : ''}
            <img src="${livre.couverture}" alt="${livre.titre}" onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'">
            <div class="info-livre">
                <div class="titre-livre">${livre.titre}</div>
                <div class="auteur-livre">✍️ ${livre.auteur}</div>
                <span class="genre-livre">${livre.genre}</span>
            </div>
        </div>
    `).join('');
}

function genererFiltres() {
    const genres = [...new Set(tousLesLivres.map(l => l.genre))];
    document.getElementById('filtres-genres').innerHTML = genres.map(genre => 
        `<button onclick="filtrerParGenre('${genre}')" class="filtre-btn" data-genre="${genre}">${genre}</button>`
    ).join('');
}

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
        <div class="carte-livre" onclick="ouvrirModale('${livre.id}')">
            <span class="badge-alire">📋 A lire</span>
            <img src="${livre.couverture}" alt="${livre.titre}" onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'">
            <div class="info-livre">
                <div class="titre-livre">${livre.titre}</div>
                <div class="auteur-livre">✍️ ${livre.auteur}</div>
                <button onclick="event.stopPropagation(); basculerALire('${livre.id}', true)" class="btn-alire btn-retirer-alire">❌ Retirer</button>
            </div>
        </div>
    `).join('');
}

function afficherTableauAdmin() {
    document.getElementById('tbody-admin').innerHTML = tousLesLivres.map(livre => `
        <tr>
            <td>${livre.id}</td>
            <td><img src="${livre.couverture}" class="img-table" onerror="this.src='https://via.placeholder.com/50x70?text=?'"></td>
            <td>${livre.titre}</td>
            <td>${livre.auteur}</td>
            <td><span class="genre-livre">${livre.genre}</span></td>
            <td>
                <button onclick="editerLivre('${livre.id}')" class="btn-modifier">✏️ Modifier</button>
                <button onclick="supprimerLivre('${livre.id}')" class="btn-supprimer">🗑️ Supprimer</button>
            </td>
        </tr>
    `).join('');
}

function mettreAJourCompteur() {
    const compteur = tousLesLivres.filter(l => l.aLire).length;
    document.getElementById('compteur-alire').textContent = `(${compteur})`;
}

// ========== NAVIGATION ==========

function afficherPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`page-${page}`).classList.add('active');
    document.getElementById(`btn-${page}`).classList.add('active');

    pageActive = page;

    if (page === 'alire') afficherListeALire();
    if (page === 'admin') afficherTableauAdmin();
}

// ========== FILTRES & RECHERCHE ==========

function filtrerParGenre(genre) {
    document.querySelectorAll('.filtre-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.genre === genre);
    });

    if (genre === 'tous') {
        livresFiltres = [...tousLesLivres];
    } else {
        livresFiltres = tousLesLivres.filter(l => l.genre === genre);
    }

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
    const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';
    let base = genreActif === 'tous' ? [...tousLesLivres] : tousLesLivres.filter(l => l.genre === genreActif);

    livresFiltres = base.filter(l => 
        l.titre.toLowerCase().includes(recherche) || 
        l.auteur.toLowerCase().includes(recherche) ||
        l.genre.toLowerCase().includes(recherche)
    );

    afficherLivres();
}

// ========== MODALES ==========

async function ouvrirModale(id) {
    const reponse = await fetch(`${API_URL}/${id}`);
    const livre = await reponse.json();
    const estALire = livre.aLire;

    document.getElementById('modale-body').innerHTML = `
        <img src="${livre.couverture}" class="modale-image" onerror="this.src='https://via.placeholder.com/600x300?text=Pas+d%27image'">
        <h2 class="modale-titre">${livre.titre}</h2>
        <p class="modale-auteur">✍️ ${livre.auteur} | 🏷️ ${livre.genre}</p>
        <p class="modale-description">${livre.description}</p>
        <button onclick="basculerALire('${livre.id}', ${estALire}); fermerModale();" 
                class="btn-alire ${estALire ? 'btn-retirer-alire' : 'btn-ajouter-alire'}">
            ${estALire ? '❌ Retirer' : '➕ Ajouter'}
        </button>
    `;

    document.getElementById('modale').classList.add('active');
}

function fermerModale() {
    document.getElementById('modale').classList.remove('active');
}

function ouvrirFormulaire() {
    livreEnEdition = null;
    document.getElementById('titre-formulaire').textContent = 'Ajouter un Livre';
    document.getElementById('form-livre').reset();
    document.getElementById('livre-id').value = '';
    document.getElementById('formulaire-modale').classList.add('active');
}

// BUG FIX: == au lieu de === (json-server retourne ID en string)
function editerLivre(id) {
    const livre = tousLesLivres.find(l => l.id == id);
    if (!livre) {
        alert('Livre non trouve');
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
        const ancien = tousLesLivres.find(l => l.id == livreEnEdition);
        livre.aLire = ancien ? ancien.aLire : false;
        livre.id = livreEnEdition;
        await modifierLivre(livreEnEdition, livre);
    } else {
        await ajouterLivre(livre);
    }

    fermerFormulaire();
    await chargerLivres();
}