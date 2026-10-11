// Ce qui reste affiché pendant le jeu : compteurs, graines, boutons, messages, soleil et lune.

import { estSemable, graineASemer } from '../game/actions';
import {
  CULTURES,
  DECORATIONS,
  IDS_CULTURES,
  IDS_DECOS,
  JOURS_PAR_SAISON,
  NOMS_SAISONS,
  type CultureId,
  type DecoId,
  type Meteo,
} from '../game/reglages';
import { annee, jourDeSaison, saisonDuJour, type GameState } from '../game/state';
import type { OutilEnMain } from '../render/chat';
import { iconeCulture, iconeDeco, iconeOutil } from '../render/dessins';

const NOMS_OUTILS: Record<OutilEnMain, string> = { beche: 'Bêche', graines: 'Graines', arrosoir: 'Arrosoir', panier: 'Panier' };
const ORDRE_OUTILS: OutilEnMain[] = ['beche', 'graines', 'arrosoir', 'panier'];
const ICONES_METEO: Record<Meteo, string> = { soleil: '☀️ Soleil', pluie: '🌧️ Pluie', neige: '❄️ Neige' };

export function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export interface Hud {
  /** `outil` est l'outil en main ; `choixGraines` dit si le choix de la graine est ouvert. */
  mettreAJour(state: GameState, outil: OutilEnMain, choixGraines: boolean): void;
  message(texte: string): void;
  /** Annonce du matin, au centre de l'écran. */
  reveil(titre: string, lignes: string[]): void;
  /** Cache les menus pendant la nuit. */
  modeNuit(actif: boolean): void;
  /** Place le soleil et la lune. `t` va de 0 (coucher) à 1 (réveil) ; null pour les cacher. */
  astres(t: number | null): void;
  /** Montre la jauge du geste en cours à cet endroit de l'écran (null pour la cacher). */
  jauge(geste: { x: number; y: number; progres: number; icone: string } | null): void;
  /** Affiche ou cache la barre du mode décoration. */
  barreDeco(state: GameState | null, choisie: DecoId | null): void;
  surSac(action: () => void): void;
  surDormir(action: () => void): void;
  surDecorer(action: () => void): void;
  surFinDeco(action: () => void): void;
  surGraine(action: (id: CultureId) => void): void;
  surOutil(action: (outil: OutilEnMain) => void): void;
  surChoixDeco(action: (id: DecoId) => void): void;
}

export function creerHud(): Hud {
  const jour = el('hud-jour');
  const meteo = el('hud-meteo');
  const argent = el('hud-argent');
  const graines = el('graines');
  const outils = el('outils');
  let cleOutils = '';
  let enJeu = true;
  const boutons = el('hud-boutons');
  const btnDeco = el<HTMLButtonElement>('btn-deco');
  const barre = el('barre-deco');
  const decoAide = el('deco-aide');
  const decoChoix = el('deco-choix');
  const toast = el('toast');
  const reveil = el('reveil');
  const soleil = el('soleil');
  const lune = el('lune');
  const jauge = el('jauge');
  const imageJauge = jauge.querySelector('img')!;
  let iconeJauge = '';

  let minuterieToast = 0;
  let minuterieReveil = 0;
  let cleGraines = '';
  let cleDeco = '';

  /** Place un astre sur un arc de cercle. u = 0 : à gauche, 0,5 : au sommet, 1 : à droite. */
  function placer(astre: HTMLElement, u: number): void {
    if (u <= 0 || u >= 1) {
      astre.style.opacity = '0';
      return;
    }
    const x = (0.12 + 0.76 * u) * window.innerWidth;
    const y = (0.72 - Math.sin(Math.PI * u) * 0.52) * window.innerHeight;
    astre.style.transform = `translate(${x}px, ${y}px)`;
    astre.style.opacity = String(Math.min(1, Math.sin(Math.PI * u) * 2.2));
  }

  return {
    mettreAJour(state, outil, choixGraines) {
      const saison = saisonDuJour(state.jour);
      jour.textContent = `${NOMS_SAISONS[saison]} · jour ${jourDeSaison(state.jour)}/${JOURS_PAR_SAISON} · an ${annee(state.jour)}`;
      meteo.textContent = ICONES_METEO[state.meteo];
      argent.textContent = String(state.argent);

      // Les graines du sac : on touche celle qu'on veut semer.
      const aSemer = graineASemer(state);
      const possedees = IDS_CULTURES.filter((id) => state.graines[id] > 0);
      const cle = possedees.map((id) => `${id}:${state.graines[id]}:${estSemable(state, id)}`).join('|') + `>${aSemer}`;
      if (cle !== cleGraines) {
        cleGraines = cle;
        graines.innerHTML = possedees
          .map((id) => {
            const classes = ['jeton'];
            if (id === aSemer) classes.push('choisi');
            if (!estSemable(state, id)) classes.push('hors-saison');
            return `<button type="button" class="${classes.join(' ')}" data-id="${id}" aria-label="Graines de ${CULTURES[id].nom}">
              <img src="${iconeCulture(id)}" alt="" /><b>${state.graines[id]}</b></button>`;
          })
          .join('');
      }

      // La barre d'outils. Le sachet montre la graine qui sera semée.
      const niveaux: Record<OutilEnMain, number> = { ...state.outils, graines: 1 };
      const cleBarre = `${outil}|${aSemer}|${aSemer ? state.graines[aSemer] : 0}|${JSON.stringify(state.outils)}`;
      if (cleBarre !== cleOutils) {
        cleOutils = cleBarre;
        outils.innerHTML = ORDRE_OUTILS.map((id) => {
          const image = id === 'graines' && aSemer ? iconeCulture(aSemer) : iconeOutil(id, niveaux[id]);
          const pastille = id === 'graines' && aSemer ? `<b>${state.graines[aSemer]}</b>` : '';
          return `<button type="button" class="jeton${id === outil ? ' choisi' : ''}" data-outil="${id}" aria-label="${NOMS_OUTILS[id]}">
            <img src="${image}" alt="" />${pastille}</button>`;
        }).join('');
      }
      graines.hidden = !(enJeu && choixGraines);

      const aDesDecos = state.decoPosees.length > 0 || IDS_DECOS.some((id) => state.decoStock[id] > 0);
      btnDeco.hidden = !aDesDecos;
    },

    message(texte) {
      toast.textContent = texte;
      toast.classList.add('visible');
      clearTimeout(minuterieToast);
      minuterieToast = window.setTimeout(() => toast.classList.remove('visible'), 2600);
    },

    reveil(titre, lignes) {
      reveil.innerHTML = `<h2>${titre}</h2>${lignes.map((l) => `<p>${l}</p>`).join('')}`;
      reveil.classList.add('visible');
      clearTimeout(minuterieReveil);
      minuterieReveil = window.setTimeout(() => reveil.classList.remove('visible'), 1600 + lignes.length * 900);
    },

    modeNuit(actif) {
      document.body.classList.toggle('nuit', actif);
      if (actif) reveil.classList.remove('visible');
    },

    astres(t) {
      if (t === null) {
        soleil.style.opacity = lune.style.opacity = '0';
        return;
      }
      // Le soleil se couche (0 → 0,3), la lune traverse le ciel (0,2 → 0,8), le soleil se lève (0,7 → 1).
      if (t < 0.5) placer(soleil, 0.5 + (t / 0.3) * 0.5);
      else placer(soleil, ((t - 0.7) / 0.3) * 0.5);
      placer(lune, (t - 0.2) / 0.6);
    },

    jauge(geste) {
      jauge.hidden = geste === null;
      if (!geste) return;
      if (geste.icone !== iconeJauge) {
        iconeJauge = geste.icone;
        imageJauge.src = geste.icone;
      }
      jauge.style.transform = `translate(${geste.x}px, ${geste.y}px)`;
      jauge.style.setProperty('--p', String(Math.min(1, geste.progres)));
    },

    barreDeco(state, choisie) {
      barre.hidden = state === null;
      boutons.hidden = state !== null;
      outils.hidden = state !== null;
      enJeu = state === null;
      if (!enJeu) graines.hidden = true;
      if (!state) {
        cleDeco = '';
        return;
      }
      const enStock = IDS_DECOS.filter((id) => state.decoStock[id] > 0);
      decoAide.textContent =
        enStock.length > 0
          ? 'Touche le sol pour poser. Touche une décoration posée pour la reprendre.'
          : 'Ton sac de décorations est vide. Touche une décoration posée pour la reprendre.';
      const cle = enStock.map((id) => `${id}:${state.decoStock[id]}`).join('|') + `>${choisie}`;
      if (cle !== cleDeco) {
        cleDeco = cle;
        decoChoix.innerHTML = enStock
          .map(
            (id) => `<button type="button" class="jeton${id === choisie ? ' choisi' : ''}" data-id="${id}" aria-label="${DECORATIONS[id].nom}">
              <img src="${iconeDeco(id)}" alt="" /><b>${state.decoStock[id]}</b></button>`,
          )
          .join('');
      }
    },

    surSac: (action) => el('btn-sac').addEventListener('click', action),
    surDormir: (action) => el('btn-dormir').addEventListener('click', action),
    surDecorer: (action) => btnDeco.addEventListener('click', action),
    surFinDeco: (action) => el('deco-fin').addEventListener('click', action),
    surGraine: (action) =>
      graines.addEventListener('click', (e) => {
        const jeton = (e.target as HTMLElement).closest<HTMLElement>('.jeton');
        if (jeton?.dataset.id) action(jeton.dataset.id as CultureId);
      }),
    surOutil: (action) =>
      outils.addEventListener('click', (e) => {
        const jeton = (e.target as HTMLElement).closest<HTMLElement>('.jeton');
        if (jeton?.dataset.outil) action(jeton.dataset.outil as OutilEnMain);
      }),
    surChoixDeco: (action) =>
      decoChoix.addEventListener('click', (e) => {
        const jeton = (e.target as HTMLElement).closest<HTMLElement>('.jeton');
        if (jeton?.dataset.id) action(jeton.dataset.id as DecoId);
      }),
  };
}
