// Les règles du jeu. Ces fonctions modifient l'état et rien d'autre :
// elles ne connaissent ni Three.js ni les menus.

import {
  CHANCES_METEO,
  CULTURES,
  DECORATIONS,
  GESTES,
  IDS_CULTURES,
  IDS_RECETTES,
  JOURS_PAR_SAISON,
  METEO_ARROSE,
  PRIX_ATELIER,
  PRIX_NIVEAUX_OUTIL,
  RECETTES,
  TERRAINS,
  type CultureId,
  type DecoId,
  type Famille,
  type Meteo,
  type OutilId,
  type RecetteId,
  type Saison,
} from './reglages';
import {
  estActive,
  jourDeSaison,
  parcellesActives,
  saisonDuJour,
  tailleTerrain,
  type GameState,
  type Plante,
} from './state';
import { caseConstructible, colonneLigne, indexParcelle } from './terrain';

// ---------------------------------------------------------------- Champs

export type Geste = 'becher' | 'semer' | 'arroser' | 'recolter';

export function estMure(plante: Plante): boolean {
  return plante.stade >= CULTURES[plante.culture].joursDePousse;
}

/** L'image à montrer : 0 = graine, 1 = petite pousse, 2 = plante moyenne, 3 = mûre. */
export function stadeVisuel(plante: Plante): 0 | 1 | 2 | 3 {
  if (plante.stade <= 0) return 0;
  if (estMure(plante)) return 3;
  return plante.stade / CULTURES[plante.culture].joursDePousse <= 0.5 ? 1 : 2;
}

/** Nombre de nuits qu'il reste avant le changement de saison (celle de ce soir comprise). */
export function nuitsRestantes(state: GameState): number {
  return JOURS_PAR_SAISON - jourDeSaison(state.jour) + 1;
}

/** Cette culture a-t-elle encore le temps de mûrir avant la fin de la saison ? */
export function aLeTemps(state: GameState, id: CultureId): boolean {
  return CULTURES[id].joursDePousse <= nuitsRestantes(state);
}

/** Peut-on semer cette graine aujourd'hui ? (on en a, c'est la saison, elle a le temps de mûrir) */
export function estSemable(state: GameState, id: CultureId): boolean {
  return state.graines[id] > 0 && CULTURES[id].saison === saisonDuJour(state.jour) && aLeTemps(state, id);
}

/** La graine qui sera semée : celle choisie si possible, sinon la première graine semable. */
export function graineASemer(state: GameState): CultureId | null {
  if (state.graineChoisie && estSemable(state, state.graineChoisie)) return state.graineChoisie;
  return IDS_CULTURES.find((id) => estSemable(state, id)) ?? null;
}

function niveauDuGeste(state: GameState, geste: Geste): number {
  if (geste === 'becher') return state.outils.beche;
  if (geste === 'arroser') return state.outils.arrosoir;
  if (geste === 'recolter') return state.outils.panier;
  return 1; // semer se fait toujours case par case
}

/** Les cases touchées quand on travaille sur celle-ci : 1 case, ou 3 de large avec un outil amélioré. */
export function zoneOutil(state: GameState, index: number, geste: Geste): number[] {
  const taille = tailleTerrain(state);
  const { col, ligne } = colonneLigne(index);
  if (col >= taille || ligne >= taille) return [];
  const rayon = niveauDuGeste(state, geste) >= 2 ? 1 : 0;
  const cases: number[] = [];
  for (let c = col - rayon; c <= col + rayon; c++) {
    if (c >= 0 && c < taille) cases.push(indexParcelle(c, ligne));
  }
  return cases;
}

/** 1 en temps normal, 2 quand l'outil est assez amélioré pour aller deux fois plus vite. */
export function vitesseOutil(state: GameState, geste: Geste): number {
  return niveauDuGeste(state, geste) >= GESTES.niveauRapide ? 2 : 1;
}

/** Ce geste est-il possible sur cette case en ce moment ? */
export function peutFaire(state: GameState, index: number, geste: Geste): boolean {
  const p = state.parcelles[index];
  if (!p || !estActive(state, index)) return false;
  switch (geste) {
    case 'becher':
      return !p.bechee;
    case 'semer':
      return p.bechee && !p.plante && graineASemer(state) !== null;
    case 'arroser':
      return p.bechee && !p.arrosee && p.plante !== null && !estMure(p.plante);
    case 'recolter':
      return p.plante !== null && estMure(p.plante);
  }
}

/** Fait le geste sur une case. Renvoie false si ce n'était pas possible. */
export function faire(state: GameState, index: number, geste: Geste): boolean {
  if (!peutFaire(state, index, geste)) return false;
  const p = state.parcelles[index];
  switch (geste) {
    case 'becher':
      p.bechee = true;
      break;
    case 'semer': {
      const graine = graineASemer(state)!;
      state.graines[graine] -= 1;
      p.plante = { culture: graine, stade: 0 };
      break;
    }
    case 'arroser':
      p.arrosee = true;
      break;
    case 'recolter':
      state.recoltes[p.plante!.culture] += 1;
      p.plante = null;
      p.arrosee = false;
      // La terre est retournée par la récolte : il faudra bêcher à nouveau avant de replanter.
      p.bechee = false;
      break;
  }
  return true;
}

/** Le geste dont cette case a besoin maintenant, ou null s'il n'y a rien à y faire aujourd'hui. */
export function gesteAttendu(state: GameState, index: number): Geste | null {
  const p = state.parcelles[index];
  if (!p || !estActive(state, index)) return null;
  if (!p.bechee) return 'becher';
  if (!p.plante) return 'semer';
  if (estMure(p.plante)) return 'recolter';
  return p.arrosee ? null : 'arroser';
}

/** Pourquoi on ne peut pas semer (pas de graine, mauvaise saison, trop tard). */
export function raisonSansGraine(state: GameState): string {
  const saison = saisonDuJour(state.jour);
  if (IDS_CULTURES.some((id) => state.graines[id] > 0 && CULTURES[id].saison === saison)) {
    return 'Trop tard pour semer : la saison se termine';
  }
  if (IDS_CULTURES.some((id) => state.graines[id] > 0)) return 'Tes graines ne poussent pas en cette saison';
  return 'Plus de graines : passe à la boutique';
}

/** Fait d'un coup le geste attendu sur une case et ses voisines (sert aux tests automatiques). */
export function agirSurParcelle(state: GameState, index: number): Geste | null {
  const geste = gesteAttendu(state, index);
  if (!geste) return null;
  let fait = false;
  for (const i of zoneOutil(state, index, geste)) fait = faire(state, i, geste) || fait;
  return fait ? geste : null;
}

// ---------------------------------------------------------------- La nuit

export interface BilanNuit {
  meteo: Meteo;
  /** La nouvelle saison, si on vient d'en changer. */
  nouvelleSaison: Saison | null;
  /** Nombre de plantes perdues parce que leur saison est finie. */
  fanees: number;
}

/**
 * La nuit : ce qui a été arrosé pousse d'un stade, puis le jour suivant commence.
 * `hasard` sert à tirer la météo (un nombre entre 0 et 1).
 */
export function dormir(state: GameState, hasard: () => number = Math.random): BilanNuit {
  const avant = saisonDuJour(state.jour);
  const actives = parcellesActives(state);

  for (const i of actives) {
    const p = state.parcelles[i];
    if (p.plante && p.arrosee && !estMure(p.plante)) p.plante.stade += 1;
    p.arrosee = false;
  }

  state.jour += 1;
  const saison = saisonDuJour(state.jour);

  // Changement de saison : ce qui n'est pas mûr et n'est plus de saison est perdu.
  let fanees = 0;
  if (saison !== avant) {
    for (const i of actives) {
      const p = state.parcelles[i];
      if (p.plante && CULTURES[p.plante.culture].saison !== saison && !estMure(p.plante)) {
        p.plante = null;
        fanees += 1;
      }
    }
  }

  const chances = CHANCES_METEO[saison];
  const tirage = hasard();
  state.meteo = tirage < chances.pluie ? 'pluie' : tirage < chances.pluie + chances.neige ? 'neige' : 'soleil';
  if (METEO_ARROSE[state.meteo]) {
    for (const i of actives) {
      const p = state.parcelles[i];
      if (p.bechee) p.arrosee = true;
    }
  }

  return { meteo: state.meteo, nouvelleSaison: saison !== avant ? saison : null, fanees };
}

// ---------------------------------------------------------------- Boutique
// Les achats renvoient null si tout va bien, ou le message d'erreur à montrer.

function payer(state: GameState, prix: number): string | null {
  if (state.argent < prix) return "Pas assez d'argent";
  state.argent -= prix;
  return null;
}

export function acheterGraine(state: GameState, id: CultureId, nombre = 1): string | null {
  if (CULTURES[id].saison !== saisonDuJour(state.jour)) return "Ce n'est pas la saison";
  const erreur = payer(state, CULTURES[id].prixGraine * nombre);
  if (erreur) return erreur;
  state.graines[id] += nombre;
  if (!state.graineChoisie || state.graines[state.graineChoisie] === 0) state.graineChoisie = id;
  return null;
}

export function prixAmelioration(state: GameState, id: OutilId): number | null {
  return PRIX_NIVEAUX_OUTIL[state.outils[id] - 1] ?? null;
}

export function ameliorerOutil(state: GameState, id: OutilId): string | null {
  const prix = prixAmelioration(state, id);
  if (prix === null) return 'Cet outil est déjà au maximum';
  const erreur = payer(state, prix);
  if (erreur) return erreur;
  state.outils[id] += 1;
  return null;
}

export function agrandirTerrain(state: GameState): string | null {
  const suivant = TERRAINS[state.niveauTerrain + 1];
  if (!suivant) return 'Le terrain est déjà au maximum';
  const erreur = payer(state, suivant.prix);
  if (erreur) return erreur;
  state.niveauTerrain += 1;
  // Les décorations posées là où le champ s'étend retournent dans le sac.
  const taille = tailleTerrain(state);
  state.decoPosees = state.decoPosees.filter((d) => {
    if (caseConstructible(d.x, d.z, taille)) return true;
    state.decoStock[d.id] += 1;
    return false;
  });
  return null;
}

export function acheterAtelier(state: GameState): string | null {
  if (state.atelier) return "Tu as déjà l'atelier";
  const erreur = payer(state, PRIX_ATELIER);
  if (erreur) return erreur;
  state.atelier = true;
  // Les recettes gratuites sont fournies avec l'atelier.
  for (const id of IDS_RECETTES) {
    if (RECETTES[id].prix === 0 && !state.recettes.includes(id)) state.recettes.push(id);
  }
  return null;
}

export function acheterRecette(state: GameState, id: RecetteId): string | null {
  if (!state.atelier) return "Il faut d'abord l'atelier";
  if (state.recettes.includes(id)) return 'Tu connais déjà cette recette';
  const erreur = payer(state, RECETTES[id].prix);
  if (erreur) return erreur;
  state.recettes.push(id);
  return null;
}

// ---------------------------------------------------------------- Vente

export function vendreRecolte(state: GameState, id: CultureId, nombre: number): number {
  const n = Math.min(nombre, state.recoltes[id]);
  const gain = n * CULTURES[id].prixVente;
  state.recoltes[id] -= n;
  state.argent += gain;
  return gain;
}

/** Le prix d'un produit de l'atelier (moyenne de ce qui est en stock). */
export function prixProduit(state: GameState, id: RecetteId): number {
  const p = state.produits[id];
  return p.quantite > 0 ? Math.round(p.valeur / p.quantite) : 0;
}

export function vendreProduit(state: GameState, id: RecetteId, nombre: number): number {
  const p = state.produits[id];
  const n = Math.min(nombre, p.quantite);
  if (n <= 0) return 0;
  const gain = n === p.quantite ? p.valeur : prixProduit(state, id) * n;
  p.quantite -= n;
  p.valeur -= gain;
  state.argent += gain;
  return gain;
}

/** Ce que rapporterait la vente de tout le sac. */
export function valeurDuSac(state: GameState): number {
  let total = 0;
  for (const id of IDS_CULTURES) total += state.recoltes[id] * CULTURES[id].prixVente;
  for (const id of IDS_RECETTES) total += state.produits[id].valeur;
  return total;
}

export function vendreTout(state: GameState): number {
  let gain = 0;
  for (const id of IDS_CULTURES) gain += vendreRecolte(state, id, state.recoltes[id]);
  for (const id of IDS_RECETTES) gain += vendreProduit(state, id, state.produits[id].quantite);
  return gain;
}

// ---------------------------------------------------------------- Atelier

/** Combien de récoltes de cette famille (fruit, légume, fleur) dans le sac. */
export function stockFamille(state: GameState, famille: Famille): number {
  let total = 0;
  for (const id of IDS_CULTURES) if (CULTURES[id].famille === famille) total += state.recoltes[id];
  return total;
}

export function fabriquer(state: GameState, id: RecetteId): string | null {
  if (!state.atelier) return "Il faut d'abord l'atelier";
  if (!state.recettes.includes(id)) return 'Tu ne connais pas cette recette';
  const recette = RECETTES[id];
  if (stockFamille(state, recette.famille) < recette.quantite) return 'Il manque des ingrédients';

  // On prend à chaque fois dans la récolte la plus abondante de la famille.
  let valeur = 0;
  for (let n = 0; n < recette.quantite; n++) {
    let choix: CultureId | null = null;
    for (const c of IDS_CULTURES) {
      if (CULTURES[c].famille !== recette.famille || state.recoltes[c] <= 0) continue;
      if (choix === null || state.recoltes[c] > state.recoltes[choix]) choix = c;
    }
    if (choix === null) break;
    state.recoltes[choix] -= 1;
    valeur += CULTURES[choix].prixVente;
  }
  state.produits[id].quantite += 1;
  state.produits[id].valeur += Math.round(valeur * recette.multiplicateur);
  return null;
}

// ---------------------------------------------------------------- Décoration

export function acheterDeco(state: GameState, id: DecoId): string | null {
  const erreur = payer(state, DECORATIONS[id].prix);
  if (erreur) return erreur;
  state.decoStock[id] += 1;
  return null;
}

export function decoSurCase(state: GameState, x: number, z: number): number {
  return state.decoPosees.findIndex((d) => Math.abs(d.x - x) < 0.01 && Math.abs(d.z - z) < 0.01);
}

export function poserDeco(state: GameState, id: DecoId, x: number, z: number): string | null {
  if (state.decoStock[id] <= 0) return "Tu n'en as plus dans ton sac";
  if (!caseConstructible(x, z, tailleTerrain(state))) return 'Pas de place ici';
  if (decoSurCase(state, x, z) >= 0) return 'Il y a déjà une décoration ici';
  state.decoStock[id] -= 1;
  state.decoPosees.push({ id, x, z });
  return null;
}

/** Reprend une décoration posée : elle retourne dans le sac. */
export function retirerDeco(state: GameState, index: number): void {
  const [deco] = state.decoPosees.splice(index, 1);
  if (deco) state.decoStock[deco.id] += 1;
}
