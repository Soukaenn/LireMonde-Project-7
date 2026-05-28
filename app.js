// =============================================
// LIREMONDE - app.js
// =============================================

// L'adresse de notre API (json-server)
const API_URL = 'http://localhost:3000/livres';

// On stocke tous les livres et les livres filtrés
let tousLesLivres = [];
let livresFiltres  = [];

// La page actuellement visible
let pageActive = 'accueil';

// L'id du livre qu'on est en train de modifier (null = on ajoute)
let livreEnEdition = null;


// =============================================
// DÉMARRAGE : on attend que la page soit prête
// =============================================

document.addEventListener('DOMContentLoaded', () => {

    // On charge les livres dès le départ
    chargerLivres();

    // Fermer la modale détails si on clique dehors
    document.getElementById('modale').addEventListener('click', function(e) {
        if (e.target.id === 'modale') {
            fermerModale();
        }
    });

    // Fermer le formulaire si on clique dehors
    document.getElementById('formulaire-modale').addEventListener('click', function(e) {
        if (e.target.id === 'formulaire-modale') {
            fermerFormulaire();
        }
    });

});


// =============================================
// CHARGEMENT DES LIVRES DEPUIS L'API
// =============================================

async function chargerLivres() {
    try {
        const reponse = await fetch(API_URL);
        tousLesLivres = await reponse.json();

        // On relit le filtre et la recherche actifs pour ne pas les perdre
        const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';
        const recherche  = document.getElementById('recherche-globale').value.toLowerCase();

        // On repart de tous les livres ou du genre choisi
        if (genreActif === 'tous') {
            livresFiltres = [...tousLesLivres];
        } else {
            livresFiltres = tousLesLivres.filter(function(l) {
                return l.genre === genreActif;
            });
        }

        // Si une recherche est en cours on l'applique aussi
        if (recherche) {
            livresFiltres = livresFiltres.filter(function(l) {
                return l.titre.toLowerCase().includes(recherche)
                    || l.auteur.toLowerCase().includes(recherche);
            });
        }

        // On affiche tout
        afficherLivres();
        genererFiltres();
        mettreAJourCompteur();
        afficherTableauAdmin();

        // On remet le bouton de filtre actif au bon endroit
        const btnActif = document.querySelector(`.filtre-btn[data-genre="${genreActif}"]`);
        if (btnActif) {
            btnActif.classList.add('active');
        } else {
            document.querySelector('.filtre-btn[data-genre="tous"]')?.classList.add('active');
        }

        // Si on est sur la page "À lire", on la rafraîchit
        if (pageActive === 'alire') {
            afficherListeALire();
        }

    } catch (erreur) {
        console.error('Erreur chargement livres :', erreur);
        document.getElementById('grille-livres').innerHTML =
            '<div class="message-vide">⚠️ Lance le serveur : npx json-server --watch db.json --port 3000</div>';
    }
}


// =============================================
// CRUD : AJOUTER / MODIFIER / SUPPRIMER
// =============================================

// Ajouter un nouveau livre
async function ajouterLivre(livre) {
    try {
        // On supprime l'id avant d'envoyer (json-server en génère un automatiquement)
        delete livre.id;

        await fetch(API_URL, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(livre)
        });

        await chargerLivres();

    } catch (erreur) {
        console.error('Erreur ajout livre :', erreur);
        alert('Impossible d\'ajouter le livre. Vérifie ta connexion au serveur.');
    }
}

// Modifier un livre existant
async function modifierLivre(id, livre) {
    try {
        await fetch(API_URL + '/' + id, {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(livre)
        });

        await chargerLivres();

    } catch (erreur) {
        console.error('Erreur modification livre :', erreur);
        alert('Impossible de modifier le livre. Vérifie ta connexion au serveur.');
    }
}

// Supprimer un livre
async function supprimerLivre(id) {
    // On demande confirmation avant de supprimer
    const confirmation = confirm('Supprimer ce livre définitivement ?');
    if (!confirmation) return;

    try {
        await fetch(API_URL + '/' + id, {
            method: 'DELETE'
        });

        await chargerLivres();

    } catch (erreur) {
        console.error('Erreur suppression livre :', erreur);
        alert('Impossible de supprimer le livre. Vérifie ta connexion au serveur.');
    }
}

// Ajouter ou retirer un livre de la liste "À lire"
async function basculerALire(id, etatActuel) {
    try {
        await fetch(API_URL + '/' + id, {
            method : 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ aLire: !etatActuel })
        });

        // On met à jour localement sans recharger toute la liste
        const livre = tousLesLivres.find(function(l) { return l.id == id; });
        if (livre) {
            livre.aLire = !etatActuel;
        }

        // On recalcule livresFiltres pour garder le filtre/recherche actifs
        const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';
        const recherche  = document.getElementById('recherche-globale').value.toLowerCase();

        if (genreActif === 'tous') {
            livresFiltres = [...tousLesLivres];
        } else {
            livresFiltres = tousLesLivres.filter(function(l) {
                return l.genre === genreActif;
            });
        }

        if (recherche) {
            livresFiltres = livresFiltres.filter(function(l) {
                return l.titre.toLowerCase().includes(recherche)
                    || l.auteur.toLowerCase().includes(recherche);
            });
        }

        // On met à jour le compteur et l'affichage de la page active
        mettreAJourCompteur();

        if (pageActive === 'accueil') afficherLivres();
        if (pageActive === 'alire')   afficherListeALire();
        if (pageActive === 'admin')   afficherTableauAdmin();

    } catch (erreur) {
        console.error('Erreur bascule À lire :', erreur);
        alert('Impossible de mettre à jour la liste À lire.');
    }
}


// =============================================
// AFFICHAGE : PAGE ACCUEIL
// =============================================

// Afficher les livres en grille
function afficherLivres() {
    const conteneur = document.getElementById('grille-livres');

    if (livresFiltres.length === 0) {
        conteneur.innerHTML = '<div class="message-vide">Aucun livre trouvé.</div>';
        return;
    }

    let html = '';

    for (let i = 0; i < livresFiltres.length; i++) {
        const livre = livresFiltres[i];

        let badge = '';
        if (livre.aLire) {
            badge = '<span class="badge-alire">📋 À lire</span>';
        }

        html += `
            <div class="carte-livre">
                ${badge}
                <img
                    src="${livre.couverture}"
                    alt="${livre.titre}"
                    onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'"
                >
                <div class="info-livre">
                    <div class="titre-livre">${livre.titre}</div>
                    <div class="auteur-livre">✍️ ${livre.auteur}</div>
                    <span class="genre-livre">${livre.genre}</span>
                    <button onclick="ouvrirModale('${livre.id}')" class="btn-voir-details">
                        👁️ Voir détails
                    </button>
                </div>
            </div>
        `;
    }

    conteneur.innerHTML = html;
}

// Générer les boutons de filtre par genre
function genererFiltres() {
    const genres = [];

    // On récupère les genres uniques
    for (let i = 0; i < tousLesLivres.length; i++) {
        const genre = tousLesLivres[i].genre;
        if (!genres.includes(genre)) {
            genres.push(genre);
        }
    }

    let html = '';
    for (let i = 0; i < genres.length; i++) {
        html += `<button onclick="filtrerParGenre('${genres[i]}')" class="filtre-btn" data-genre="${genres[i]}">${genres[i]}</button>`;
    }

    document.getElementById('filtres-genres').innerHTML = html;
}


// =============================================
// AFFICHAGE : PAGE "À LIRE"
// =============================================

function afficherListeALire() {
    const livresALire = tousLesLivres.filter(function(l) { return l.aLire; });

    const conteneur   = document.getElementById('liste-alire');
    const messageVide = document.getElementById('vide-alire');

    if (livresALire.length === 0) {
        conteneur.innerHTML     = '';
        messageVide.style.display = 'block';
        return;
    }

    messageVide.style.display = 'none';

    let html = '';

    for (let i = 0; i < livresALire.length; i++) {
        const livre = livresALire[i];

        html += `
            <div class="carte-livre" onclick="ouvrirModale('${livre.id}')">
                <span class="badge-alire">📋 À lire</span>
                <img
                    src="${livre.couverture}"
                    alt="${livre.titre}"
                    onerror="this.src='https://via.placeholder.com/250x300?text=Pas+d%27image'"
                >
                <div class="info-livre">
                    <div class="titre-livre">${livre.titre}</div>
                    <div class="auteur-livre">✍️ ${livre.auteur}</div>
                    <button
                        onclick="event.stopPropagation(); retirerEtRediriger('${livre.id}')"
                        class="btn-alire btn-retirer-alire"
                    >
                        ❌ Retirer
                    </button>
                </div>
            </div>
        `;
    }

    conteneur.innerHTML = html;
}


// =============================================
// AFFICHAGE : PAGE ADMIN
// =============================================

function afficherTableauAdmin() {
    let html = '';

    for (let i = 0; i < tousLesLivres.length; i++) {
        const livre = tousLesLivres[i];

        html += `
            <tr>
                <td>${livre.id}</td>
                <td>
                    <img
                        src="${livre.couverture}"
                        class="img-table"
                        onerror="this.src='https://via.placeholder.com/50x70?text=?'"
                    >
                </td>
                <td>${livre.titre}</td>
                <td>${livre.auteur}</td>
                <td><span class="genre-livre">${livre.genre}</span></td>
                <td>
                    <button onclick="editerLivre('${livre.id}')" class="btn-modifier">✏️ Modifier</button>
                    <button onclick="supprimerLivre('${livre.id}')" class="btn-supprimer">🗑️ Supprimer</button>
                </td>
            </tr>
        `;
    }

    document.getElementById('tbody-admin').innerHTML = html;
}


// =============================================
// COMPTEUR "À LIRE" DANS LA NAVBAR
// =============================================

function mettreAJourCompteur() {
    let compteur = 0;

    for (let i = 0; i < tousLesLivres.length; i++) {
        if (tousLesLivres[i].aLire) {
            compteur++;
        }
    }

    document.getElementById('compteur-alire').textContent = '(' + compteur + ')';
}


// =============================================
// NAVIGATION ENTRE LES PAGES
// =============================================

function afficherPage(page) {
    // On cache toutes les pages
    document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active');
    });

    // On retire l'état actif de tous les boutons nav
    document.querySelectorAll('.nav-btn').forEach(function(b) {
        b.classList.remove('active');
    });

    // On affiche la bonne page et on active le bon bouton
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('btn-'  + page).classList.add('active');

    pageActive = page;

    // Chaque page a son propre affichage à déclencher
    if (page === 'alire') afficherListeALire();
    if (page === 'admin') afficherTableauAdmin();
}


// =============================================
// FILTRE PAR GENRE
// =============================================

function filtrerParGenre(genre) {
    // On met en surbrillance le bouton cliqué
    document.querySelectorAll('.filtre-btn').forEach(function(btn) {
        if (btn.dataset.genre === genre) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // On filtre selon le genre choisi
    if (genre === 'tous') {
        livresFiltres = [...tousLesLivres];
    } else {
        livresFiltres = tousLesLivres.filter(function(l) {
            return l.genre === genre;
        });
    }

    // Si une recherche est active, on la garde
    const recherche = document.getElementById('recherche-globale').value.toLowerCase();
    if (recherche) {
        livresFiltres = livresFiltres.filter(function(l) {
            return l.titre.toLowerCase().includes(recherche)
                || l.auteur.toLowerCase().includes(recherche);
        });
    }

    afficherLivres();
}


// =============================================
// RECHERCHE EN TEMPS RÉEL
// =============================================

function rechercherLivres(motCle) {
    const recherche  = motCle.toLowerCase();
    const genreActif = document.querySelector('.filtre-btn.active')?.dataset.genre || 'tous';

    // On part du bon genre
    let base = [];
    if (genreActif === 'tous') {
        base = [...tousLesLivres];
    } else {
        base = tousLesLivres.filter(function(l) {
            return l.genre === genreActif;
        });
    }

    // On filtre par le mot-clé saisi
    livresFiltres = base.filter(function(l) {
        return l.titre.toLowerCase().includes(recherche)
            || l.auteur.toLowerCase().includes(recherche)
            || l.genre.toLowerCase().includes(recherche);
    });

    afficherLivres();
}


// =============================================
// MODALE DÉTAILS D'UN LIVRE
// =============================================

async function ouvrirModale(id) {
    try {
        // On récupère le livre directement depuis l'API par son id
        const reponse = await fetch(API_URL + '/' + id);
        const livre   = await reponse.json();

        const estALire = livre.aLire;

        let btnTexte  = estALire ? '❌ Retirer de la liste À lire' : '✅ Ajouter à la liste À lire';
        let btnClasse = estALire ? 'btn-retirer-alire' : 'btn-ajouter-alire';

        document.getElementById('modale-body').innerHTML = `
            <img
                src="${livre.couverture}"
                class="modale-image"
                onerror="this.src='https://via.placeholder.com/600x300?text=Pas+d%27image'"
            >
            <h2 class="modale-titre">${livre.titre}</h2>
            <p class="modale-auteur">✍️ ${livre.auteur} | 🏷️ ${livre.genre}</p>
            <p class="modale-description">${livre.description}</p>
            <button
                onclick="toggleDepuisModale('${livre.id}', ${estALire})"
                class="btn-alire ${btnClasse}"
            >
                ${btnTexte}
            </button>
        `;

        document.getElementById('modale').classList.add('active');

    } catch (erreur) {
        console.error('Erreur ouverture modale :', erreur);
        alert('Impossible de charger les détails du livre.');
    }
}

function fermerModale() {
    document.getElementById('modale').classList.remove('active');
}

// Appelée depuis la modale :
// - si on AJOUTE  → on ferme la modale et on va sur la page "À lire"
// - si on RETIRE  → on ferme la modale et on va sur la page "Accueil"
async function toggleDepuisModale(id, estALire) {
    await basculerALire(id, estALire);
    fermerModale();

    if (estALire) {
        // Le livre était "À lire", on vient de le retirer → on retourne à l'accueil
        afficherPage('accueil');
    } else {
        // Le livre n'était pas "À lire", on vient de l'ajouter → on va sur "À lire"
        afficherPage('alire');
    }
}

// Appelée depuis la page "À lire" quand on clique "Retirer" :
// → retire le livre puis retourne automatiquement à l'accueil
async function retirerEtRediriger(id) {
    await basculerALire(id, true);
    afficherPage('accueil');
}


// =============================================
// FORMULAIRE : AJOUTER / MODIFIER UN LIVRE
// =============================================

// Ouvrir le formulaire en mode "ajout"
function ouvrirFormulaire() {
    livreEnEdition = null;
    document.getElementById('titre-formulaire').textContent = 'Ajouter un Livre';
    document.getElementById('form-livre').reset();
    document.getElementById('livre-id').value = '';
    document.getElementById('formulaire-modale').classList.add('active');
}

// Ouvrir le formulaire en mode "modification"
function editerLivre(id) {
    const livre = tousLesLivres.find(function(l) { return l.id == id; });

    if (!livre) {
        alert('Livre non trouvé.');
        return;
    }

    // On retient l'id du livre qu'on modifie
    livreEnEdition = id;

    document.getElementById('titre-formulaire').textContent = 'Modifier le Livre';
    document.getElementById('livre-id').value        = livre.id;
    document.getElementById('form-titre').value      = livre.titre;
    document.getElementById('form-auteur').value     = livre.auteur;
    document.getElementById('form-genre').value      = livre.genre;
    document.getElementById('form-description').value = livre.description;
    document.getElementById('form-couverture').value = livre.couverture;

    document.getElementById('formulaire-modale').classList.add('active');
}

function fermerFormulaire() {
    document.getElementById('formulaire-modale').classList.remove('active');
}

// Sauvegarder (ajouter ou modifier selon livreEnEdition)
async function sauvegarderLivre(event) {
    event.preventDefault();

    // On récupère les valeurs du formulaire
    const livre = {
        titre      : document.getElementById('form-titre').value,
        auteur     : document.getElementById('form-auteur').value,
        genre      : document.getElementById('form-genre').value,
        description: document.getElementById('form-description').value,
        couverture : document.getElementById('form-couverture').value,
        aLire      : false
    };

    if (livreEnEdition) {
        // On garde l'état "À lire" du livre avant modification
        const ancien = tousLesLivres.find(function(l) { return l.id == livreEnEdition; });
        livre.aLire = ancien ? ancien.aLire : false;
        livre.id    = livreEnEdition;

        await modifierLivre(livreEnEdition, livre);
    } else {
        await ajouterLivre(livre);
    }

    fermerFormulaire();
}