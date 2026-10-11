// Les menus en HTML par-dessus la scène : compteurs, boutons, messages, écran de nuit.

import { REGLAGES } from '../game/reglages';
import type { GameState } from '../game/state';

const NOMS_SAISONS = { printemps: 'Printemps', ete: 'Été', automne: 'Automne', hiver: 'Hiver' };

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export interface Hud {
  mettreAJour(state: GameState): void;
  message(texte: string): void;
  /** Joue le passage de la nuit. `auMilieu` est appelé quand l'écran est noir. */
  nuit(auMilieu: () => number): Promise<void>;
  surAcheter(action: () => void): void;
  surVendre(action: () => void): void;
  surDormir(action: () => void): void;
}

export function creerHud(): Hud {
  const jour = el<HTMLSpanElement>('hud-jour');
  const argent = el<HTMLSpanElement>('hud-argent');
  const graines = el<HTMLSpanElement>('hud-graines');
  const radis = el<HTMLSpanElement>('hud-radis');
  const btnAcheter = el<HTMLButtonElement>('btn-acheter');
  const btnVendre = el<HTMLButtonElement>('btn-vendre');
  const btnDormir = el<HTMLButtonElement>('btn-dormir');
  const toast = el<HTMLDivElement>('toast');
  const ecranNuit = el<HTMLDivElement>('nuit');
  const texteNuit = el<HTMLDivElement>('nuit-texte');

  const radisR = REGLAGES.cultures.radis;
  let minuterieToast = 0;

  const attendre = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

  return {
    mettreAJour(state) {
      jour.textContent = `Jour ${state.jour} · ${NOMS_SAISONS[state.saison]}`;
      argent.textContent = String(state.argent);
      graines.textContent = String(state.graines.radis);
      radis.textContent = String(state.recoltes.radis);
      btnAcheter.textContent = `Acheter une graine · ${radisR.prixGraine}`;
      btnAcheter.disabled = state.argent < radisR.prixGraine;
      const gain = state.recoltes.radis * radisR.prixVente;
      btnVendre.textContent = gain > 0 ? `Vendre la récolte · +${gain}` : 'Vendre la récolte';
      btnVendre.disabled = gain === 0;
    },

    message(texte) {
      toast.textContent = texte;
      toast.classList.add('visible');
      clearTimeout(minuterieToast);
      minuterieToast = window.setTimeout(() => toast.classList.remove('visible'), 2200);
    },

    async nuit(auMilieu) {
      texteNuit.textContent = '🌙';
      ecranNuit.classList.add('visible');
      await attendre(700);
      const nouveauJour = auMilieu();
      await attendre(500);
      texteNuit.textContent = `☀️ Jour ${nouveauJour}`;
      await attendre(900);
      ecranNuit.classList.remove('visible');
      await attendre(500);
    },

    surAcheter: (action) => btnAcheter.addEventListener('click', action),
    surVendre: (action) => btnVendre.addEventListener('click', action),
    surDormir: (action) => btnDormir.addEventListener('click', action),
  };
}
