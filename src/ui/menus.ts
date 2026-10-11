// Le grand menu : sac (vente), boutique (graines, outils, ferme, déco), partie. Et le menu de l'atelier.
// Les boutons portent `data-a` (l'action), `data-id` et `data-n` ; main.ts décide quoi en faire.

import { aLeTemps, nuitsRestantes, prixAmelioration, prixProduit, stockFamille, valeurDuSac } from '../game/actions';
import {
  CULTURES,
  DECORATIONS,
  EFFETS_NIVEAUX_OUTIL,
  IDS_CULTURES,
  IDS_DECOS,
  IDS_OUTILS,
  IDS_RECETTES,
  NOMS_FAMILLES,
  NOMS_SAISONS,
  OUTILS,
  PRIX_ATELIER,
  RECETTES,
  TERRAINS,
} from '../game/reglages';
import { annee, saisonDuJour, type GameState } from '../game/state';
import { iconeCulture, iconeDeco, iconeRecette } from '../render/dessins';
import { el } from './hud';

export type Onglet = 'sac' | 'graines' | 'outils' | 'ferme' | 'deco' | 'partie';

const ONGLETS: [Onglet, string][] = [
  ['sac', 'Sac'],
  ['graines', 'Graines'],
  ['outils', 'Outils'],
  ['ferme', 'Ferme'],
  ['deco', 'Déco'],
  ['partie', 'Partie'],
];

export interface ActionMenu {
  type: string;
  id: string;
  n: number;
}

export interface Menus {
  ouvrir(onglet?: Onglet): void;
  ouvrirAtelier(): void;
  fermer(): void;
  estOuvert(): boolean;
  /** Réaffiche le contenu d'après l'état. */
  rafraichir(): void;
}

const PIECE = '<i class="piece"></i>';
const prix = (n: number) => `${PIECE} ${n}`;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function bouton(texte: string, action: string, options: { id?: string; n?: number; actif?: boolean; style?: string } = {}) {
  const { id = '', n = 1, actif = true, style = '' } = options;
  return `<button type="button" class="bouton ${style}" data-a="${action}" data-id="${id}" data-n="${n}"${actif ? '' : ' disabled'}>${texte}</button>`;
}

function ligne(image: string, titre: string, detail: string, actions: string): string {
  const vignette = image.startsWith('data:') ? `<img src="${image}" alt="" />` : `<div class="vignette">${image}</div>`;
  return `<div class="ligne">${vignette}<div class="texte"><b>${titre}</b>${detail}</div><div class="actions">${actions}</div></div>`;
}

// ---------------------------------------------------------------- Contenu des onglets

function pageSac(s: GameState): string {
  const total = valeurDuSac(s);
  const lignes: string[] = [];
  for (const id of IDS_CULTURES) {
    const n = s.recoltes[id];
    if (n <= 0) continue;
    const c = CULTURES[id];
    lignes.push(
      ligne(
        iconeCulture(id),
        `${c.nom} × ${n}`,
        `<span>${prix(c.prixVente)} pièce · ${NOMS_FAMILLES[c.famille]}</span>`,
        bouton('Vendre 1', 'vendre-recolte', { id }) + bouton(`Tout · ${prix(n * c.prixVente)}`, 'vendre-recolte', { id, n }),
      ),
    );
  }
  for (const id of IDS_RECETTES) {
    const p = s.produits[id];
    if (p.quantite <= 0) continue;
    lignes.push(
      ligne(
        iconeRecette(id),
        `${RECETTES[id].nom} × ${p.quantite}`,
        `<span>${prix(prixProduit(s, id))} pièce · fait à l'atelier</span>`,
        bouton('Vendre 1', 'vendre-produit', { id }) + bouton(`Tout · ${prix(p.valeur)}`, 'vendre-produit', { id, n: p.quantite }),
      ),
    );
  }
  if (lignes.length === 0) {
    return `<p class="note">Ton sac est vide. Ce que tu récoltes arrive ici, prêt à être vendu.</p>`;
  }
  return (
    `<div class="entete"><p>Tout se vend à prix fixe.</p>${bouton(`Tout vendre · ${prix(total)}`, 'vendre-tout', { style: 'principal' })}</div>` +
    lignes.join('')
  );
}

function pageGraines(s: GameState): string {
  const saison = saisonDuJour(s.jour);
  const nuits = nuitsRestantes(s);
  const lignes = IDS_CULTURES.filter((id) => CULTURES[id].saison === saison).map((id) => {
    const c = CULTURES[id];
    const tard = !aLeTemps(s, id);
    const detail =
      `<span>Pousse en ${c.joursDePousse} jours · se vend ${prix(c.prixVente)} · ${NOMS_FAMILLES[c.famille]}</span>` +
      (tard ? `<span class="alerte">Trop tard pour la semer cette saison</span>` : '') +
      (s.graines[id] > 0 ? `<span>Dans ton sac : ${s.graines[id]}</span>` : '');
    return ligne(
      iconeCulture(id),
      c.nom,
      detail,
      bouton(`× 1 · ${prix(c.prixGraine)}`, 'acheter-graine', { id, actif: s.argent >= c.prixGraine }) +
        bouton(`× 5 · ${prix(c.prixGraine * 5)}`, 'acheter-graine', { id, n: 5, actif: s.argent >= c.prixGraine * 5 }),
    );
  });
  const fin = nuits === 1 ? 'la saison se termine cette nuit' : `encore ${nuits} nuits avant la saison suivante`;
  return `<div class="entete"><p>Graines de ${NOMS_SAISONS[saison].toLowerCase()} : ${fin}.</p></div>` + lignes.join('');
}

function pageOutils(s: GameState): string {
  return (
    `<div class="entete"><p>Un outil amélioré traite plusieurs cases d'un seul geste.</p></div>` +
    IDS_OUTILS.map((id) => {
      const niveau = s.outils[id];
      const cout = prixAmelioration(s, id);
      const detail =
        `<span>Niveau ${niveau} : ${EFFETS_NIVEAUX_OUTIL[niveau - 1]}</span>` +
        (cout !== null ? `<span>Niveau ${niveau + 1} : ${EFFETS_NIVEAUX_OUTIL[niveau]}</span>` : '');
      const action =
        cout !== null
          ? bouton(`Améliorer · ${prix(cout)}`, 'ameliorer-outil', { id, actif: s.argent >= cout, style: 'principal' })
          : bouton('Au maximum', '', { actif: false });
      return ligne(String(niveau), OUTILS[id].nom, detail, action);
    }).join('')
  );
}

function pageFerme(s: GameState): string {
  const lignes: string[] = [];
  const terrain = TERRAINS[s.niveauTerrain];
  const suivant = TERRAINS[s.niveauTerrain + 1];
  lignes.push(
    ligne(
      `${terrain.taille}×${terrain.taille}`,
      'Terrain',
      `<span>${terrain.taille * terrain.taille} parcelles</span>` +
        (suivant ? `<span>Suivant : ${suivant.taille * suivant.taille} parcelles</span>` : ''),
      suivant
        ? bouton(`Agrandir · ${prix(suivant.prix)}`, 'agrandir', { actif: s.argent >= suivant.prix, style: 'principal' })
        : bouton('Au maximum', '', { actif: false }),
    ),
  );
  if (!s.atelier) {
    lignes.push(
      ligne(
        '🏠',
        'Atelier',
        `<span>Transforme ta récolte pour la vendre plus cher. Trois recettes fournies.</span>`,
        bouton(`Acheter · ${prix(PRIX_ATELIER)}`, 'acheter-atelier', { actif: s.argent >= PRIX_ATELIER, style: 'principal' }),
      ),
    );
  } else {
    lignes.push(ligne('🏠', 'Atelier', `<span>Touche le bâtiment au toit bleu pour y entrer.</span>`, ''));
    for (const id of IDS_RECETTES) {
      const r = RECETTES[id];
      const connue = s.recettes.includes(id);
      lignes.push(
        ligne(
          iconeRecette(id),
          `Recette : ${r.nom}`,
          `<span>${pluriel(r.quantite, NOMS_FAMILLES[r.famille])} · vaut ${String(r.multiplicateur).replace('.', ',')} fois les ingrédients</span>`,
          connue
            ? bouton('Connue', '', { actif: false })
            : bouton(`Apprendre · ${prix(r.prix)}`, 'acheter-recette', { id, actif: s.argent >= r.prix, style: 'principal' }),
        ),
      );
    }
  }
  return lignes.join('');
}

function pageDeco(s: GameState): string {
  const aDesDecos = s.decoPosees.length > 0 || IDS_DECOS.some((id) => s.decoStock[id] > 0);
  return (
    `<div class="entete"><p>Pour le plaisir : aucune influence sur les récoltes.</p>${bouton('Décorer la ferme', 'decorer', { actif: aDesDecos, style: 'principal' })}</div>` +
    IDS_DECOS.map((id) => {
      const d = DECORATIONS[id];
      const posees = s.decoPosees.filter((p) => p.id === id).length;
      const possede = s.decoStock[id] + posees;
      return ligne(
        iconeDeco(id),
        d.nom,
        possede > 0 ? `<span>Dans ton sac : ${s.decoStock[id]} · posées : ${posees}</span>` : '',
        bouton(`Acheter · ${prix(d.prix)}`, 'acheter-deco', { id, actif: s.argent >= d.prix }),
      );
    }).join('')
  );
}

function pagePartie(s: GameState, confirmation: boolean): string {
  return (
    `<div class="entete"><p>Jour ${s.jour} de ta ferme, an ${annee(s.jour)}. La partie s'enregistre toute seule sur cet appareil.</p></div>` +
    (confirmation
      ? ligne(
          '!',
          'Tout effacer ?',
          `<span class="alerte">Ta ferme, ton argent et tes achats seront perdus.</span>`,
          bouton('Annuler', 'annuler-effacement') + bouton('Oui, tout effacer', 'nouvelle-partie', { style: 'danger' }),
        )
      : ligne('↺', 'Nouvelle partie', `<span>Recommencer depuis le premier jour.</span>`, bouton('Recommencer', 'demander-effacement')))
  );
}

function pageAtelier(s: GameState): string {
  const stock = (['fruit', 'legume', 'fleur'] as const)
    .map((f) => pluriel(stockFamille(s, f), NOMS_FAMILLES[f]))
    .join(' · ');
  const lignes = s.recettes.map((id) => {
    const r = RECETTES[id];
    const possible = Math.floor(stockFamille(s, r.famille) / r.quantite);
    return ligne(
      iconeRecette(id),
      r.nom,
      `<span>${pluriel(r.quantite, NOMS_FAMILLES[r.famille])} · vaut ${String(r.multiplicateur).replace('.', ',')} fois les ingrédients</span>` +
        (s.produits[id].quantite > 0 ? `<span>Dans ton sac : ${s.produits[id].quantite}</span>` : ''),
      bouton('Fabriquer', 'fabriquer', { id, actif: possible >= 1, style: 'principal' }) +
        bouton(`Tout (${possible})`, 'fabriquer', { id, n: possible, actif: possible >= 2 }),
    );
  });
  const reste = IDS_RECETTES.length - s.recettes.length;
  return (
    `<div class="entete"><p>Dans ton sac : ${stock}.</p></div>` +
    lignes.join('') +
    (reste > 0 ? `<p class="note">${pluriel(reste, 'autre')} ${reste > 1 ? 'recettes' : 'recette'} à apprendre dans la boutique, onglet Ferme.</p>` : '')
  );
}

// ---------------------------------------------------------------- Le menu lui-même

export function creerMenus(etat: () => GameState, surAction: (action: ActionMenu) => void): Menus {
  const menu = el('menu');
  const onglets = el('onglets');
  const contenu = el('menu-contenu');
  let onglet: Onglet = 'sac';
  let atelier = false;
  let confirmation = false;

  function rafraichir(): void {
    if (menu.hidden) return;
    const s = etat();
    const defilement = contenu.scrollTop;
    if (atelier) {
      onglets.innerHTML = '<h2>Atelier</h2>';
      contenu.innerHTML = pageAtelier(s);
    } else {
      onglets.innerHTML = ONGLETS.map(
        ([id, nom]) => `<button type="button" data-onglet="${id}"${id === onglet ? ' class="actif"' : ''}>${nom}</button>`,
      ).join('');
      const pages: Record<Onglet, () => string> = {
        sac: () => pageSac(s),
        graines: () => pageGraines(s),
        outils: () => pageOutils(s),
        ferme: () => pageFerme(s),
        deco: () => pageDeco(s),
        partie: () => pagePartie(s, confirmation),
      };
      contenu.innerHTML = pages[onglet]();
    }
    contenu.scrollTop = defilement;
  }

  function fermer(): void {
    menu.hidden = true;
    confirmation = false;
  }

  menu.addEventListener('click', (e) => {
    const cible = e.target as HTMLElement;
    if (cible === menu || cible.closest('#menu-fermer')) {
      fermer();
      return;
    }
    const boutonOnglet = cible.closest<HTMLElement>('[data-onglet]');
    if (boutonOnglet) {
      onglet = boutonOnglet.dataset.onglet as Onglet;
      confirmation = false;
      contenu.scrollTop = 0;
      rafraichir();
      return;
    }
    const b = cible.closest<HTMLButtonElement>('[data-a]');
    if (!b || b.disabled || !b.dataset.a) return;
    if (b.dataset.a === 'demander-effacement' || b.dataset.a === 'annuler-effacement') {
      confirmation = b.dataset.a === 'demander-effacement';
      rafraichir();
      return;
    }
    surAction({ type: b.dataset.a, id: b.dataset.id ?? '', n: Number(b.dataset.n ?? 1) });
  });

  return {
    ouvrir(choix) {
      atelier = false;
      if (choix) onglet = choix;
      menu.hidden = false;
      contenu.scrollTop = 0;
      rafraichir();
    },
    ouvrirAtelier() {
      atelier = true;
      menu.hidden = false;
      contenu.scrollTop = 0;
      rafraichir();
    },
    fermer,
    estOuvert: () => !menu.hidden,
    rafraichir,
  };
}
