// Les règles du jeu. Ces fonctions modifient l'état et rien d'autre :
// elles ne connaissent ni Three.js ni les menus.

import { REGLAGES, type CultureId } from './reglages';
import type { GameState, Plante } from './state';

export type Geste = 'becher' | 'semer' | 'arroser' | 'recolter';

export interface Resultat {
  /** Le geste effectué, ou null si rien n'a été fait. */
  geste: Geste | null;
  /** Un message à montrer au joueur, s'il y en a un. */
  message?: string;
}

export function estMure(plante: Plante): boolean {
  return plante.stade >= REGLAGES.cultures[plante.culture].joursDePousse;
}

/** Fait sur une parcelle le geste qui a du sens à ce moment-là. */
export function agirSurParcelle(state: GameState, index: number, culture: CultureId = 'radis'): Resultat {
  const p = state.parcelles[index];
  if (!p) return { geste: null };

  if (!p.bechee) {
    p.bechee = true;
    return { geste: 'becher' };
  }

  if (!p.plante) {
    if (state.graines[culture] <= 0) {
      return { geste: null, message: 'Plus de graines : achètes-en une' };
    }
    state.graines[culture] -= 1;
    p.plante = { culture, stade: 0 };
    return { geste: 'semer' };
  }

  if (estMure(p.plante)) {
    state.recoltes[p.plante.culture] += 1;
    p.plante = null;
    p.arrosee = false;
    return { geste: 'recolter' };
  }

  if (!p.arrosee) {
    p.arrosee = true;
    return { geste: 'arroser' };
  }

  return { geste: null, message: 'Déjà arrosé : va dormir pour que ça pousse' };
}

/** La nuit : ce qui a été arrosé pousse d'un stade, puis le jour suivant commence. */
export function dormir(state: GameState): void {
  for (const p of state.parcelles) {
    if (p.plante && p.arrosee && !estMure(p.plante)) {
      p.plante.stade += 1;
    }
    p.arrosee = false;
  }
  state.jour += 1;
}

export function acheterGraine(state: GameState, culture: CultureId = 'radis'): Resultat {
  const prix = REGLAGES.cultures[culture].prixGraine;
  if (state.argent < prix) {
    return { geste: null, message: "Pas assez d'argent" };
  }
  state.argent -= prix;
  state.graines[culture] += 1;
  return { geste: null };
}

/** Vend toute la récolte. Renvoie l'argent gagné. */
export function vendreRecolte(state: GameState): number {
  let gain = 0;
  for (const id of Object.keys(state.recoltes) as CultureId[]) {
    gain += state.recoltes[id] * REGLAGES.cultures[id].prixVente;
    state.recoltes[id] = 0;
  }
  state.argent += gain;
  return gain;
}
