import * as THREE from 'three';
import './style.css';
import * as regles from './game/actions';
import {
  CULTURES,
  DECORATIONS,
  IDS_DECOS,
  NOMS_SAISONS,
  OUTILS,
  RECETTES,
  type CultureId,
  type DecoId,
  type OutilId,
  type RecetteId,
} from './game/reglages';
import { jourDeSaison, nouvellePartie, saisonDuJour, tailleTerrain, type Personnage } from './game/state';
import {
  BORD_MIN,
  bordMax,
  caseDeco,
  parcelleSous,
  PORTE_ATELIER,
  PORTE_MAISON,
  positionParcelle,
} from './game/terrain';
import { calculerAmbiance, creerAmbiance } from './render/ambiance';
import { APPARENCES, creerChat, portraitChat, type Chat } from './render/chat';
import { creerParticules } from './render/meteo';
import { creerMonde } from './render/monde';
import { creerScene } from './render/scene';
import { charger, effacer, sauvegarder } from './sauvegarde';
import { creerHud, el } from './ui/hud';
import { creerMenus, type ActionMenu } from './ui/menus';

// L'état du jeu : séparé de l'affichage (voir CLAUDE.md).
const state = charger();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const vue = creerScene(canvas);
const monde = creerMonde(vue.scene, state);
const particules = creerParticules(vue.scene);
const ambiance = creerAmbiance();
const hud = creerHud();
const menus = creerMenus(() => state, traiterActionMenu);
let chat: Chat | null = null;

/** À appeler après chaque changement de l'état : redessine tout et sauvegarde. */
function rafraichir(): void {
  monde.synchroniser(state);
  hud.mettreAJour(state);
  hud.barreDeco(modeDeco ? state : null, decoChoisie);
  menus.rafraichir();
  vue.cadrer(tailleTerrain(state));
  particules.regler(state.meteo);
  sauvegarder(state);
}

// ---------------------------------------------------------------- Le chat et ses déplacements

interface Cible {
  x: number;
  z: number;
  /** Où regarder une fois arrivé. */
  regard?: { x: number; z: number };
  arrivee?: () => void;
}
/** La file des endroits où le chat doit aller, avec un geste à l'arrivée. */
let file: Cible[] = [];

function installerChat(personnage: Personnage): void {
  if (chat) vue.scene.remove(chat.objet);
  chat = creerChat(personnage);
  chat.objet.position.set(PORTE_MAISON.x, 0, PORTE_MAISON.z);
  chat.regarderVers(PORTE_MAISON.x + 1, PORTE_MAISON.z + 1);
  vue.scene.add(chat.objet);
}

const CONSEILS_DEBUT: Record<regles.Geste, string> = {
  becher: 'Bien bêché ! Touche encore la parcelle pour semer',
  semer: 'Semé ! Touche encore pour arroser',
  arroser: 'Arrosé ! Va dormir pour que ça pousse : touche la maison',
  recolter: 'Récolté ! Vends ta récolte dans « Sac et boutique »',
};
const conseilsDonnes = new Set<string>();

function allerSurParcelle(index: number): void {
  const p = positionParcelle(index);
  file.push({
    // Le chat se place derrière la parcelle : il fait ainsi face au joueur pendant qu'il travaille.
    x: p.x - 0.4,
    z: p.z - 0.4,
    regard: p,
    arrivee: () => {
      const resultat = regles.agirSurParcelle(state, index);
      if (resultat.geste) chat?.sauter();
      if (resultat.message) hud.message(resultat.message);
      // Les tout premiers gestes sont accompagnés d'un conseil.
      else if (resultat.geste && state.jour <= 3 && !conseilsDonnes.has(resultat.geste)) {
        conseilsDonnes.add(resultat.geste);
        hud.message(CONSEILS_DEBUT[resultat.geste]);
      }
      rafraichir();
    },
  });
}

// ---------------------------------------------------------------- La nuit

const DUREE_COUCHER = 1.5;
const DUREE_NUIT = 1.5;
const DUREE_LEVER = 1.5;
const DUREE_TOTALE = DUREE_COUCHER + DUREE_NUIT + DUREE_LEVER;
/** Pendant la nuit : le temps écoulé, et si le jour suivant a déjà été calculé. */
let nuit: { temps: number; bilan: regles.BilanNuit | null } | null = null;
let obscurite = 0;

function allerDormir(): void {
  if (nuit || !chat) return;
  if (modeDeco) quitterDeco();
  menus.fermer();
  file = [
    {
      x: PORTE_MAISON.x,
      z: PORTE_MAISON.z,
      regard: { x: PORTE_MAISON.x - 1, z: PORTE_MAISON.z },
      arrivee: () => {
        nuit = { temps: 0, bilan: null };
        hud.modeNuit(true);
        if (chat) chat.objet.visible = false;
      },
    },
  ];
}

function animerNuit(dt: number): void {
  if (!nuit) return;
  nuit.temps += dt;
  const t = nuit.temps;

  if (t < DUREE_COUCHER) obscurite = t / DUREE_COUCHER;
  else if (t < DUREE_COUCHER + DUREE_NUIT) obscurite = 1;
  else obscurite = Math.max(0, 1 - (t - DUREE_COUCHER - DUREE_NUIT) / DUREE_LEVER);
  hud.astres(Math.min(1, t / DUREE_TOTALE));

  // Au milieu de la nuit : les plantes poussent, le jour suivant commence.
  if (!nuit.bilan && t >= DUREE_COUCHER + DUREE_NUIT / 2) {
    nuit.bilan = regles.dormir(state);
    rafraichir();
  }

  if (t >= DUREE_TOTALE && nuit.bilan) {
    const bilan = nuit.bilan;
    nuit = null;
    obscurite = 0;
    hud.astres(null);
    hud.modeNuit(false);
    if (chat) {
      chat.objet.visible = true;
      chat.regarderVers(PORTE_MAISON.x + 1, PORTE_MAISON.z + 1);
    }
    annoncerLeJour(bilan);
  }
}

function annoncerLeJour(bilan: regles.BilanNuit): void {
  const saison = saisonDuJour(state.jour);
  const lignes: string[] = [];
  if (bilan.nouvelleSaison) lignes.push('Nouvelle saison : de nouvelles graines sont en boutique');
  if (bilan.fanees > 0) {
    lignes.push(
      bilan.fanees === 1
        ? "Une plante n'a pas survécu au changement de saison"
        : `${bilan.fanees} plantes n'ont pas survécu au changement de saison`,
    );
  }
  if (bilan.meteo === 'pluie') lignes.push('Il pleut : tout est déjà arrosé');
  if (bilan.meteo === 'neige') lignes.push('Il neige');
  if (regles.nuitsRestantes(state) === 1) lignes.push('Dernier jour de la saison');
  hud.reveil(`${NOMS_SAISONS[saison]} · jour ${jourDeSaison(state.jour)}`, lignes);
}

// ---------------------------------------------------------------- Mode décoration

let modeDeco = false;
let decoChoisie: DecoId | null = null;

function entrerDeco(): void {
  modeDeco = true;
  file = [];
  menus.fermer();
  if (!decoChoisie || state.decoStock[decoChoisie] <= 0) {
    decoChoisie = IDS_DECOS.find((id) => state.decoStock[id] > 0) ?? null;
  }
  rafraichir();
}

function quitterDeco(): void {
  modeDeco = false;
  rafraichir();
}

function toucherEnModeDeco(x: number, z: number): void {
  const c = caseDeco(x, z);
  const dejaLa = regles.decoSurCase(state, c.x, c.z);
  if (dejaLa >= 0) {
    // Reprendre une décoration : elle devient celle qu'on tient.
    decoChoisie = state.decoPosees[dejaLa].id;
    regles.retirerDeco(state, dejaLa);
  } else if (decoChoisie) {
    const erreur = regles.poserDeco(state, decoChoisie, c.x, c.z);
    if (erreur) hud.message(erreur);
    else if (state.decoStock[decoChoisie] <= 0) {
      decoChoisie = IDS_DECOS.find((id) => state.decoStock[id] > 0) ?? null;
    }
  } else {
    hud.message("Achète des décorations dans la boutique, onglet Déco");
  }
  rafraichir();
}

// ---------------------------------------------------------------- Toucher l'écran (ou cliquer)

const rayon = new THREE.Raycaster();
const planSol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointSol = new THREE.Vector3();
let depart: { x: number; y: number } | null = null;

canvas.addEventListener('pointerdown', (e) => {
  depart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  if (!depart || nuit || !chat) return;
  const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
  depart = null;
  if (bouge > 12) return; // un glissement, pas un toucher

  const cadre = canvas.getBoundingClientRect();
  const souris = new THREE.Vector2(
    ((e.clientX - cadre.left) / cadre.width) * 2 - 1,
    -((e.clientY - cadre.top) / cadre.height) * 2 + 1,
  );
  rayon.setFromCamera(souris, vue.camera);
  const surLeSol = rayon.ray.intersectPlane(planSol, pointSol) !== null;

  if (modeDeco) {
    if (surLeSol) toucherEnModeDeco(pointSol.x, pointSol.z);
    return;
  }

  // Toucher la maison = aller se coucher. Toucher l'atelier = y entrer.
  if (rayon.intersectObject(monde.maison, true).length > 0) {
    allerDormir();
    return;
  }
  if (state.atelier && rayon.intersectObject(monde.atelier, true).length > 0) {
    file = [
      {
        x: PORTE_ATELIER.x,
        z: PORTE_ATELIER.z,
        regard: { x: PORTE_ATELIER.x, z: PORTE_ATELIER.z - 1 },
        arrivee: () => menus.ouvrirAtelier(),
      },
    ];
    return;
  }

  if (!surLeSol) return;
  const index = parcelleSous(pointSol.x, pointSol.z, tailleTerrain(state));
  if (index !== null) {
    // Les touchers sur plusieurs parcelles s'enchaînent.
    allerSurParcelle(index);
  } else {
    // Toucher le sol : le chat y va, et oublie ce qui était prévu.
    const max = bordMax(tailleTerrain(state));
    file = [
      {
        x: THREE.MathUtils.clamp(pointSol.x, BORD_MIN, max),
        z: THREE.MathUtils.clamp(pointSol.z, BORD_MIN, max),
      },
    ];
  }
});

// ---------------------------------------------------------------- Boutons et menus

hud.surSac(() => menus.ouvrir());
hud.surDormir(allerDormir);
hud.surDecorer(entrerDeco);
hud.surFinDeco(quitterDeco);
hud.surGraine((id) => {
  if (!regles.estSemable(state, id)) {
    hud.message(
      CULTURES[id].saison === saisonDuJour(state.jour)
        ? `Trop tard pour semer : ${CULTURES[id].nom.toLowerCase()} n'aurait pas le temps de mûrir`
        : `${CULTURES[id].nom} : se sème en ${NOMS_SAISONS[CULTURES[id].saison].toLowerCase()}`,
    );
    return;
  }
  state.graineChoisie = id;
  rafraichir();
});
hud.surChoixDeco((id) => {
  decoChoisie = id;
  rafraichir();
});

function traiterActionMenu(action: ActionMenu): void {
  let erreur: string | null = null;
  let message: string | null = null;

  switch (action.type) {
    case 'vendre-recolte': {
      const gain = regles.vendreRecolte(state, action.id as CultureId, action.n);
      message = `Vendu : +${gain}`;
      break;
    }
    case 'vendre-produit': {
      const gain = regles.vendreProduit(state, action.id as RecetteId, action.n);
      message = `Vendu : +${gain}`;
      break;
    }
    case 'vendre-tout':
      message = `Vendu : +${regles.vendreTout(state)}`;
      break;
    case 'acheter-graine':
      erreur = regles.acheterGraine(state, action.id as CultureId, action.n);
      break;
    case 'ameliorer-outil':
      erreur = regles.ameliorerOutil(state, action.id as OutilId);
      if (!erreur) message = `${OUTILS[action.id as OutilId].nom} : niveau ${state.outils[action.id as OutilId]}`;
      break;
    case 'agrandir':
      erreur = regles.agrandirTerrain(state);
      if (!erreur) {
        menus.fermer();
        message = 'Le terrain est agrandi !';
      }
      break;
    case 'acheter-atelier':
      erreur = regles.acheterAtelier(state);
      if (!erreur) {
        menus.fermer();
        message = "L'atelier est construit : touche-le pour y entrer";
      }
      break;
    case 'acheter-recette':
      erreur = regles.acheterRecette(state, action.id as RecetteId);
      if (!erreur) message = `Nouvelle recette : ${RECETTES[action.id as RecetteId].nom}`;
      break;
    case 'fabriquer':
      for (let i = 0; i < action.n && !erreur; i++) erreur = regles.fabriquer(state, action.id as RecetteId);
      if (!erreur) message = `${RECETTES[action.id as RecetteId].nom} : dans ton sac`;
      break;
    case 'acheter-deco':
      erreur = regles.acheterDeco(state, action.id as DecoId);
      if (!erreur) message = `${DECORATIONS[action.id as DecoId].nom} : dans ton sac de décorations`;
      break;
    case 'decorer':
      entrerDeco();
      return;
    case 'nouvelle-partie':
      recommencer();
      return;
  }

  if (erreur) hud.message(erreur);
  else if (message) hud.message(message);
  rafraichir();
}

function recommencer(): void {
  effacer();
  Object.assign(state, nouvellePartie());
  file = [];
  modeDeco = false;
  decoChoisie = null;
  conseilsDonnes.clear();
  menus.fermer();
  if (chat) vue.scene.remove(chat.objet);
  chat = null;
  rafraichir();
  proposerLeChoix();
}

// ---------------------------------------------------------------- Choix du personnage

function proposerLeChoix(): void {
  const cartes = el('choix-cartes');
  if (!cartes.hasChildNodes()) {
    for (const personnage of ['chat', 'chatte'] as const) {
      const carte = document.createElement('button');
      carte.type = 'button';
      carte.innerHTML = `<img src="${portraitChat(personnage)}" alt="" />${APPARENCES[personnage].nom}`;
      carte.addEventListener('click', () => {
        state.personnage = personnage;
        installerChat(personnage);
        el('choix').hidden = true;
        rafraichir();
        hud.message('Touche une parcelle pour la bêcher');
      });
      cartes.append(carte);
    }
  }
  el('choix').hidden = false;
}

// En portrait, on conseille le paysage sans bloquer.
el('rotate-skip').addEventListener('click', () => el('rotate').classList.add('ferme'));

// ---------------------------------------------------------------- Démarrage et boucle d'affichage

vue.cadrer(tailleTerrain(state), true);
if (state.personnage) installerChat(state.personnage);
else proposerLeChoix();
rafraichir();

const horloge = new THREE.Clock();
function boucle(): void {
  const dt = Math.min(horloge.getDelta(), 0.05);

  const cible = file[0];
  if (cible && chat && !nuit) {
    if (chat.avancerVers(cible.x, cible.z, dt)) {
      file.shift();
      if (cible.regard) chat.regarderVers(cible.regard.x, cible.regard.z);
      cible.arrivee?.();
    }
  }
  animerNuit(dt);

  calculerAmbiance(ambiance, saisonDuJour(state.jour), state.meteo, obscurite);
  vue.appliquerAmbiance(ambiance);
  monde.appliquerAmbiance(ambiance);

  chat?.animer(dt);
  monde.animer(dt);
  particules.animer(dt);
  vue.animer(dt);
  vue.render();
  requestAnimationFrame(boucle);
}
boucle();

// Pour les tests automatiques uniquement : permet d'inspecter et de modifier la partie depuis la console.
(window as unknown as Record<string, unknown>).__ferme = { state, rafraichir, vue };
