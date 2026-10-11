// Sauvegarde locale, sur l'appareil : l'état du jeu est enregistré tel quel.

import { nouvellePartie, VERSION_SAUVEGARDE, type GameState } from './game/state';

const CLE = 'ferme-aux-chats.sauvegarde';

export function sauvegarder(state: GameState): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(state));
  } catch {
    // Stockage indisponible (navigation privée…) : le jeu continue sans sauvegarde.
  }
}

/** Renvoie la partie sauvegardée, ou une nouvelle partie s'il n'y en a pas. */
export function charger(): GameState {
  const neuve = nouvellePartie();
  try {
    const texte = localStorage.getItem(CLE);
    if (!texte) return neuve;
    const lu = JSON.parse(texte) as Partial<GameState>;
    if (lu.version !== VERSION_SAUVEGARDE || !Array.isArray(lu.parcelles)) return neuve;
    if (lu.parcelles.length !== neuve.parcelles.length) return neuve;
    // On complète avec les valeurs par défaut : une sauvegarde plus ancienne
    // ne connaît pas forcément les cultures ou décorations ajoutées depuis.
    return {
      ...neuve,
      ...lu,
      graines: { ...neuve.graines, ...lu.graines },
      recoltes: { ...neuve.recoltes, ...lu.recoltes },
      produits: { ...neuve.produits, ...lu.produits },
      outils: { ...neuve.outils, ...lu.outils },
      decoStock: { ...neuve.decoStock, ...lu.decoStock },
    };
  } catch {
    return neuve;
  }
}

export function effacer(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}
