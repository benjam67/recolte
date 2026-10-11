import * as THREE from 'three';
import './style.css';
import * as regles from './game/actions';
import {
  CULTURES,
  DECORATIONS,
  DISTANCE_PAR_EFFORT,
  EFFORT,
  EFFORT_PAR_TOUCHER,
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
import { APPARENCES, creerChat, portraitChat, type Chat, type OutilEnMain } from './render/chat';
import { iconeOutil } from './render/dessins';
import { creerParticules } from './render/meteo';
import { creerMonde, type Chantier } from './render/monde';
import { creerScene } from './render/scene';
import { charger, effacer, sauvegarder } from './sauvegarde';
import { creerHud, el } from './ui/hud';
import { creerMenus, type ActionMenu } from './ui/menus';
import { installerPleinEcran } from './ui/pleinEcran';

// L'état du jeu : séparé de l'affichage (voir CLAUDE.md).
const state = charger();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const vue = creerScene(canvas);
/** Les gestes commencés sur les parcelles, et où ils en sont : le décor s'en sert pour montrer la terre qui change. */
const chantier: Chantier = new Map();
const monde = creerMonde(vue.scene, state, chantier);
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

// ---------------------------------------------------------------- Les gestes : bêcher, semer, arroser, récolter
//
// Toucher une parcelle y envoie le chat. Une fois sur place, il sort l'outil qu'il faut, et le joueur
// frotte la parcelle du doigt (ou la touche plusieurs fois) pour faire avancer le geste.

interface Travail {
  index: number;
  geste: regles.Geste;
  /** Les parcelles concernées (plusieurs avec un outil amélioré). */
  cases: number[];
  /** De 0 à 1. */
  progres: number;
}
let travail: Travail | null = null;
/** La parcelle devant laquelle le chat se tient, prêt à travailler. */
let surPlace: number | null = null;
/** Un toucher donné pendant que le chat marchait : il comptera à l'arrivée. */
let toucherEnAttente = false;

const OUTIL_DU_GESTE: Record<regles.Geste, OutilEnMain> = {
  becher: 'beche',
  semer: 'graines',
  arroser: 'arrosoir',
  recolter: 'panier',
};

function niveauOutil(geste: regles.Geste): number {
  if (geste === 'becher') return state.outils.beche;
  if (geste === 'arroser') return state.outils.arrosoir;
  if (geste === 'recolter') return state.outils.panier;
  return 1;
}

const CONSEILS_GESTE: Record<regles.Geste, string> = {
  becher: 'Frotte la parcelle du doigt pour la bêcher',
  semer: 'Frotte encore pour semer',
  arroser: 'Frotte encore pour arroser',
  recolter: 'Frotte la plante pour la récolter',
};
const CONSEILS_APRES: Partial<Record<regles.Geste, string>> = {
  arroser: 'Arrosé ! Va dormir pour que ça pousse : touche la maison',
  recolter: 'Récolté ! Vends ta récolte dans « Sac et boutique »',
};
const conseilsDonnes = new Set<string>();

function conseiller(cle: string, texte: string | undefined): void {
  if (!texte || state.jour > 3 || conseilsDonnes.has(cle)) return;
  conseilsDonnes.add(cle);
  hud.message(texte);
}

/** Le chat s'éloigne ou fait autre chose : il range son outil. Le geste commencé reste dans la terre. */
function quitterTravail(): void {
  travail = null;
  surPlace = null;
  toucherEnAttente = false;
  chat?.tenir(null);
}

function allerSurParcelle(index: number): void {
  if (surPlace === index && file.length === 0) return; // déjà sur place
  quitterTravail();
  const p = positionParcelle(index);
  file = [
    {
      // Le chat se place derrière la parcelle : il fait ainsi face au joueur pendant qu'il travaille.
      x: p.x - 0.4,
      z: p.z - 0.4,
      regard: p,
      arrivee: () => {
        surPlace = index;
        preparerTravail(true);
        if (toucherEnAttente) avancerTravail(EFFORT_PAR_TOUCHER);
        toucherEnAttente = false;
      },
    },
  ];
}

/** Regarde ce qu'il y a à faire sur la parcelle où se tient le chat, et sort le bon outil. */
function preparerTravail(avecMessage: boolean): void {
  if (surPlace === null) return;
  const prevu = regles.prevoirGeste(state, surPlace);
  if (!prevu.geste) {
    travail = null;
    chat?.tenir(null);
    if (avecMessage && prevu.message) hud.message(prevu.message);
    return;
  }
  // On reprend un geste déjà commencé sur cette parcelle.
  const commence = chantier.get(surPlace);
  const progres = commence && commence.geste === prevu.geste ? commence.progres : 0;
  travail = { index: surPlace, geste: prevu.geste, cases: prevu.cases, progres };
  chat?.tenir(OUTIL_DU_GESTE[prevu.geste], niveauOutil(prevu.geste));
  conseiller(`geste:${prevu.geste}`, CONSEILS_GESTE[prevu.geste]);
}

/** Fait avancer le geste en cours. `effort` est dans l'unité des réglages (voir EFFORT). */
function avancerTravail(effort: number): void {
  if (!travail) return;
  travail.progres += effort / EFFORT[travail.geste];
  chat?.travailler();
  for (const i of travail.cases) chantier.set(i, { geste: travail.geste, progres: Math.min(1, travail.progres) });
  if (travail.progres < 1) return;

  // Le geste est terminé : on l'applique pour de bon.
  const fini = travail;
  travail = null;
  for (const i of fini.cases) chantier.delete(i);
  regles.agirSurParcelle(state, fini.index);
  chat?.sauter();
  rafraichir();
  conseiller(`apres:${fini.geste}`, CONSEILS_APRES[fini.geste]);
  // S'il reste quelque chose à faire sur cette parcelle, le chat change d'outil et on continue.
  preparerTravail(false);
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
  quitterTravail();
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
    chantier.clear(); // les gestes commencés la veille sont oubliés
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
  quitterTravail();
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
const pointEcran = new THREE.Vector3();

/** Le doigt posé sur l'écran : où il est, la parcelle visée, et la distance déjà parcourue. */
let doigt: { x: number; y: number; index: number | null; chemin: number } | null = null;
/** En dessous de cette distance (en pixels), c'est un simple toucher et pas un frottement. */
const SEUIL_FROTTEMENT = 12;

/** Lance un rayon depuis ce point de l'écran. Renvoie true s'il touche le sol (le point est dans `pointSol`). */
function viser(e: PointerEvent): boolean {
  const cadre = canvas.getBoundingClientRect();
  const souris = new THREE.Vector2(
    ((e.clientX - cadre.left) / cadre.width) * 2 - 1,
    -((e.clientY - cadre.top) / cadre.height) * 2 + 1,
  );
  rayon.setFromCamera(souris, vue.camera);
  return rayon.ray.intersectPlane(planSol, pointSol) !== null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (nuit || !chat) return;
  canvas.setPointerCapture(e.pointerId);
  const surLeSol = viser(e);
  const surBatiment =
    rayon.intersectObject(monde.maison, true).length > 0 ||
    (state.atelier && rayon.intersectObject(monde.atelier, true).length > 0);
  const index =
    surLeSol && !modeDeco && !surBatiment ? parcelleSous(pointSol.x, pointSol.z, tailleTerrain(state)) : null;
  doigt = { x: e.clientX, y: e.clientY, index, chemin: 0 };
  // Dès que le doigt se pose sur une parcelle, le chat s'y rend.
  if (index !== null) allerSurParcelle(index);
});

canvas.addEventListener('pointermove', (e) => {
  if (!doigt) return;
  const pas = Math.hypot(e.clientX - doigt.x, e.clientY - doigt.y);
  doigt.x = e.clientX;
  doigt.y = e.clientY;
  doigt.chemin += pas;
  // Frotter fait avancer le geste, une fois le chat arrivé devant la parcelle.
  if (doigt.index !== null && doigt.index === surPlace && doigt.chemin > SEUIL_FROTTEMENT) {
    avancerTravail(pas / (window.innerHeight * DISTANCE_PAR_EFFORT));
  }
});

canvas.addEventListener('pointercancel', () => {
  doigt = null;
});

canvas.addEventListener('pointerup', (e) => {
  const d = doigt;
  doigt = null;
  if (!d || nuit || !chat) return;
  if (d.chemin > SEUIL_FROTTEMENT) return; // c'était un frottement ou un glissement, pas un toucher

  const surLeSol = viser(e);

  if (modeDeco) {
    if (surLeSol) toucherEnModeDeco(pointSol.x, pointSol.z);
    return;
  }

  // Toucher une parcelle : chaque toucher fait avancer un peu le geste.
  if (d.index !== null) {
    if (surPlace !== d.index) toucherEnAttente = true; // le chat est encore en route
    else if (travail) avancerTravail(EFFORT_PAR_TOUCHER);
    else preparerTravail(true);
    return;
  }

  // Toucher la maison = aller se coucher. Toucher l'atelier = y entrer.
  if (rayon.intersectObject(monde.maison, true).length > 0) {
    allerDormir();
    return;
  }
  if (state.atelier && rayon.intersectObject(monde.atelier, true).length > 0) {
    quitterTravail();
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

  // Toucher le sol : le chat y va.
  if (!surLeSol) return;
  quitterTravail();
  const max = bordMax(tailleTerrain(state));
  file = [
    {
      x: THREE.MathUtils.clamp(pointSol.x, BORD_MIN, max),
      z: THREE.MathUtils.clamp(pointSol.z, BORD_MIN, max),
    },
  ];
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
  preparerTravail(false);
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
  // Un achat peut changer ce qu'il y a à faire là où se tient le chat (nouvelles graines, outil amélioré).
  preparerTravail(false);
}

function recommencer(): void {
  effacer();
  Object.assign(state, nouvellePartie());
  file = [];
  modeDeco = false;
  decoChoisie = null;
  conseilsDonnes.clear();
  chantier.clear();
  quitterTravail();
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
        hud.message('Touche une parcelle : ton chat ira y travailler');
      });
      cartes.append(carte);
    }
  }
  el('choix').hidden = false;
}

// En portrait, on conseille le paysage sans bloquer.
el('rotate-skip').addEventListener('click', () => el('rotate').classList.add('ferme'));

installerPleinEcran(el<HTMLButtonElement>('btn-plein-ecran'), (texte) => hud.message(texte));

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

  // La jauge du geste en cours flotte au-dessus de la tête du chat.
  if (travail && chat && !nuit) {
    pointEcran.set(chat.objet.position.x, 1.95, chat.objet.position.z).project(vue.camera);
    hud.jauge({
      x: ((pointEcran.x + 1) / 2) * window.innerWidth,
      y: ((1 - pointEcran.y) / 2) * window.innerHeight,
      progres: travail.progres,
      icone: iconeOutil(OUTIL_DU_GESTE[travail.geste], niveauOutil(travail.geste)),
    });
  } else {
    hud.jauge(null);
  }

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
(window as unknown as Record<string, unknown>).__ferme = { state, rafraichir, vue, chantier };
