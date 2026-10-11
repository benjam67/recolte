import * as THREE from 'three';
import './style.css';
import * as regles from './game/actions';
import {
  CULTURES,
  DECORATIONS,
  GESTES,
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
  PAS,
  PORTE_ATELIER,
  PORTE_MAISON,
} from './game/terrain';
import { calculerAmbiance, creerAmbiance } from './render/ambiance';
import { APPARENCES, creerChat, portraitChat, type Chat, type OutilEnMain } from './render/chat';
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
  hud.mettreAJour(state, outil, choixGraines);
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
  chat.tenir(outil, niveauOutil(outil));
  vue.scene.add(chat.objet);
}

// ---------------------------------------------------------------- Les outils et leurs gestes
//
// Le joueur choisit un outil dans la barre, puis fait le geste de cet outil sur les parcelles :
// - bêche : glisser le doigt à travers les cases (plusieurs passages) ;
// - graines : toucher les cases bêchées, ou glisser pour semer à la volée ;
// - arrosoir : garder le doigt appuyé et le promener ;
// - panier : tirer une plante mûre vers le haut.
// Le chat court derrière le doigt, l'outil à la main. Le geste agit là où est le doigt, sans attendre
// le chat : sinon un geste rapide serait perdu.

const GESTE_DE_L_OUTIL: Record<OutilEnMain, regles.Geste> = {
  beche: 'becher',
  graines: 'semer',
  arrosoir: 'arroser',
  panier: 'recolter',
};
const OUTIL_DU_GESTE: Record<regles.Geste, string> = {
  becher: 'la bêche',
  semer: 'les graines',
  arroser: "l'arrosoir",
  recolter: 'le panier',
};
const CONSEILS_OUTIL: Record<OutilEnMain, string> = {
  beche: 'Bêche : glisse le doigt sur les cases, trois passages chacune',
  graines: 'Graines : touche les cases bêchées, ou glisse pour semer à la volée',
  arrosoir: 'Arrosoir : garde le doigt appuyé sur ce que tu as semé',
  panier: 'Panier : tire les plantes mûres vers le haut',
};
const CONSEILS_APRES: Partial<Record<regles.Geste, string>> = {
  becher: 'Bien bêché ! Prends les graines dans la barre en bas',
  semer: "Semé ! Prends l'arrosoir",
  arroser: 'Arrosé ! Va dormir pour que ça pousse : touche la maison',
  recolter: 'Récolté ! Vends ta récolte dans « Sac et boutique »',
};
const conseilsDonnes = new Set<string>();

/** Les conseils ne s'affichent qu'une fois chacun, pendant les trois premiers jours. */
function conseiller(cle: string, texte: string | undefined): void {
  if (!texte || state.jour > 3 || conseilsDonnes.has(cle)) return;
  conseilsDonnes.add(cle);
  hud.message(texte);
}

/** L'outil que le chat a en main. */
let outil: OutilEnMain = 'beche';
/** Le choix de la graine est-il ouvert au-dessus de la barre ? */
let choixGraines = false;

function niveauOutil(o: OutilEnMain): number {
  return o === 'graines' ? 1 : state.outils[o];
}

function choisirOutil(nouveau: OutilEnMain): void {
  // Toucher le sachet de graines déjà en main ouvre (ou referme) le choix de la graine.
  choixGraines = nouveau === 'graines' && (outil !== 'graines' ? false : !choixGraines);
  outil = nouveau;
  chat?.tenir(outil, niveauOutil(outil));
  conseiller(`outil:${outil}`, CONSEILS_OUTIL[outil]);
  rafraichir();
}

/**
 * Fait avancer un geste sur une case et ses voisines (selon le niveau de l'outil).
 * `part` va de 0 à 1 : la part du geste accomplie par ce mouvement. Renvoie true si quelque chose a avancé.
 */
function avancerGeste(index: number, geste: regles.Geste, part: number): boolean {
  let avance = false;
  let termine = false;
  for (const i of regles.zoneOutil(state, index, geste)) {
    if (!regles.peutFaire(state, i, geste)) continue;
    const commence = chantier.get(i);
    const progres = (commence && commence.geste === geste ? commence.progres : 0) + part;
    avance = true;
    if (progres >= 1) {
      chantier.delete(i);
      regles.faire(state, i, geste);
      termine = true;
    } else {
      chantier.set(i, { geste, progres });
    }
  }
  if (avance) chat?.travailler();
  if (termine) {
    rafraichir();
    conseiller(`apres:${geste}`, CONSEILS_APRES[geste]);
  }
  return avance;
}

/** Le chat lâche ce qu'il faisait (il va dormir, entre à l'atelier, on passe en mode décoration…). */
function quitterTravail(): void {
  doigt = null;
  choixGraines = false;
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

/** Le doigt posé sur l'écran. */
interface Doigt {
  x: number;
  y: number;
  /** L'endroit du sol sous le doigt, et la parcelle qui s'y trouve. */
  solX: number;
  solZ: number;
  index: number | null;
  /** La parcelle où le doigt s'est posé, et à quelle hauteur de l'écran (pour le panier). */
  indexDepart: number | null;
  yDepart: number;
  /** Distance parcourue sur l'écran, en pixels. */
  chemin: number;
  /** Ce toucher a-t-il fait avancer un geste ? */
  aAgi: boolean;
}
let doigt: Doigt | null = null;
/** En dessous de cette distance (en pixels), c'est un simple toucher et pas un glissement. */
const SEUIL_GLISSEMENT = 12;

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

function surUnBatiment(): boolean {
  return (
    rayon.intersectObject(monde.maison, true).length > 0 ||
    (state.atelier && rayon.intersectObject(monde.atelier, true).length > 0)
  );
}

/** Le chat court se placer juste derrière le doigt, pour faire face au joueur. */
function suivreLeDoigt(d: Doigt): void {
  file = [{ x: d.solX - 0.45, z: d.solZ - 0.45, regard: { x: d.solX, z: d.solZ } }];
}

/** Semer : une graine par case, dès que le doigt passe dessus. */
function semerSousLeDoigt(d: Doigt): void {
  if (d.index !== null && avancerGeste(d.index, 'semer', 1)) d.aAgi = true;
}

canvas.addEventListener('pointerdown', (e) => {
  if (nuit || !chat) return;
  canvas.setPointerCapture(e.pointerId);
  choixGraines = false;
  const surLeSol = viser(e);
  const index = surLeSol && !modeDeco && !surUnBatiment() ? parcelleSous(pointSol.x, pointSol.z, tailleTerrain(state)) : null;
  doigt = {
    x: e.clientX,
    y: e.clientY,
    solX: pointSol.x,
    solZ: pointSol.z,
    index,
    indexDepart: index,
    yDepart: e.clientY,
    chemin: 0,
    aAgi: false,
  };
  if (index !== null) {
    suivreLeDoigt(doigt);
    if (outil === 'graines') semerSousLeDoigt(doigt);
  }
});

canvas.addEventListener('pointermove', (e) => {
  const d = doigt;
  if (!d || nuit || !chat) return;
  const avantX = d.solX;
  const avantZ = d.solZ;
  d.chemin += Math.hypot(e.clientX - d.x, e.clientY - d.y);
  d.x = e.clientX;
  d.y = e.clientY;
  if (!viser(e) || modeDeco) return;
  d.solX = pointSol.x;
  d.solZ = pointSol.z;
  d.index = parcelleSous(pointSol.x, pointSol.z, tailleTerrain(state));

  // Le panier se joue sur place : le chat reste près de la plante qu'on tire.
  if (outil === 'panier') {
    if (d.indexDepart === null) return;
    const tire = ((d.yDepart - d.y) / (window.innerHeight * GESTES.hauteurArrachage)) * regles.vitesseOutil(state, 'recolter');
    for (const i of regles.zoneOutil(state, d.indexDepart, 'recolter')) chantier.delete(i);
    if (tire > 0 && avancerGeste(d.indexDepart, 'recolter', tire)) d.aAgi = true;
    return;
  }

  // Les autres gestes se font en glissant : le trait peut commencer en dehors du champ.
  if (surUnBatiment()) return;
  suivreLeDoigt(d);
  if (outil === 'beche') {
    // Chaque traversée d'une case compte pour un passage. Le trait est découpé en petits bouts,
    // pour que chaque case reçoive exactement la longueur qui la traverse, même si le doigt va vite.
    // On compte un peu large (0,4 passage de marge) : le dernier passage finit la case même en biais.
    const distance = Math.hypot(d.solX - avantX, d.solZ - avantZ);
    const bouts = Math.max(1, Math.ceil(distance / 0.15));
    const part = (distance / bouts / PAS / (GESTES.passagesBeche - 0.4)) * regles.vitesseOutil(state, 'becher');
    for (let k = 0; k < bouts; k++) {
      const t = (k + 0.5) / bouts;
      const sous = parcelleSous(avantX + (d.solX - avantX) * t, avantZ + (d.solZ - avantZ) * t, tailleTerrain(state));
      if (sous !== null && avancerGeste(sous, 'becher', part)) d.aAgi = true;
    }
  } else if (outil === 'graines') {
    const distance = Math.hypot(d.solX - avantX, d.solZ - avantZ);
    const bouts = Math.max(1, Math.ceil(distance / 0.3));
    for (let k = 1; k <= bouts; k++) {
      const t = k / bouts;
      const sous = parcelleSous(avantX + (d.solX - avantX) * t, avantZ + (d.solZ - avantZ) * t, tailleTerrain(state));
      if (sous !== null && avancerGeste(sous, 'semer', 1)) d.aAgi = true;
    }
  }
});

canvas.addEventListener('pointercancel', () => {
  doigt = null;
});

canvas.addEventListener('pointerup', (e) => {
  const d = doigt;
  doigt = null;
  if (!d || nuit || !chat) return;

  // Une plante lâchée avant d'être arrachée retombe en place.
  if (outil === 'panier' && d.indexDepart !== null) {
    for (const i of regles.zoneOutil(state, d.indexDepart, 'recolter')) chantier.delete(i);
  }
  if (d.chemin > SEUIL_GLISSEMENT) return; // c'était un glissement, pas un toucher

  const surLeSol = viser(e);

  if (modeDeco) {
    if (surLeSol) toucherEnModeDeco(pointSol.x, pointSol.z);
    return;
  }

  // Un simple toucher sur une parcelle.
  if (d.index !== null) {
    const geste = GESTE_DE_L_OUTIL[outil];
    // Avec la bêche, un toucher compte pour un passage.
    if (outil === 'beche' && avancerGeste(d.index, 'becher', 1 / GESTES.passagesBeche)) return;
    if (d.aAgi) return;
    // Rien ne s'est passé : on dit pourquoi.
    const attendu = regles.gesteAttendu(state, d.index);
    if (attendu === null) hud.message('Déjà arrosé : va dormir pour que ça pousse');
    else if (attendu !== geste) hud.message(`Ici, il faut ${OUTIL_DU_GESTE[attendu]}`);
    else if (geste === 'semer') hud.message(regles.raisonSansGraine(state));
    else if (geste === 'recolter') hud.message('Tire la plante vers le haut');
    else if (geste === 'arroser') hud.message('Garde le doigt appuyé pour arroser');
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
  choixGraines = false;
  rafraichir();
});
hud.surOutil(choisirOutil);
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
  // Un outil amélioré change de couleur dans la main du chat.
  chat?.tenir(outil, niveauOutil(outil));
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
  outil = 'beche';
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
        hud.message(CONSEILS_OUTIL.beche);
        conseilsDonnes.add('outil:beche');
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
    // Tant que le doigt est posé, le chat court pour le suivre.
    if (chat.avancerVers(cible.x, cible.z, dt, doigt ? 2.6 : 1)) {
      file.shift();
      if (cible.regard) chat.regarderVers(cible.regard.x, cible.regard.z);
      cible.arrivee?.();
    }
  }
  animerNuit(dt);

  // L'arrosoir verse tant que le doigt reste appuyé sur une case.
  if (doigt && outil === 'arrosoir' && doigt.index !== null && !nuit) {
    const part = (dt / GESTES.secondesArrosage) * regles.vitesseOutil(state, 'arroser');
    if (avancerGeste(doigt.index, 'arroser', part)) doigt.aAgi = true;
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
