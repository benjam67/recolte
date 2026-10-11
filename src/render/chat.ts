// Les deux chats du jeu, en volumes simples animés par le code.
// Le visage (yeux, museau, moustaches) est une image collée sur la tête.

import * as THREE from 'three';
import type { Personnage } from '../game/state';

const VITESSE = 4.6; // cases par seconde

/** Ce que le chat peut tenir dans sa main droite. */
export type OutilEnMain = 'beche' | 'arrosoir' | 'panier' | 'graines';

/** La couleur du métal selon le niveau de l'outil : fer, argent, or. */
export const METAUX = ['#a3abb5', '#cfe6f7', '#f5c542'];

interface Apparence {
  nom: string;
  pelage: string;
  pelageFonce: string;
  ventre: string;
  accessoire: 'foulard' | 'fleur';
  couleurAccessoire: string;
}

/** Ce qui distingue les deux chats. À ajuster quand tu auras décidé de leur look. */
export const APPARENCES: Record<Personnage, Apparence> = {
  chat: {
    nom: 'Basile',
    pelage: '#8f9bb3',
    pelageFonce: '#6f7b96',
    ventre: '#eef0f4',
    accessoire: 'foulard',
    couleurAccessoire: '#e2574c',
  },
  chatte: {
    nom: 'Capucine',
    pelage: '#f0a558',
    pelageFonce: '#d98236',
    ventre: '#fff1dc',
    accessoire: 'fleur',
    couleurAccessoire: '#f37aa8',
  },
};

function textureVisage(): THREE.Texture {
  const canevas = document.createElement('canvas');
  canevas.width = canevas.height = 256;
  const c = canevas.getContext('2d')!;
  const sombre = '#3a2b22';
  // Museau clair
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.ellipse(128, 168, 52, 36, 0, 0, Math.PI * 2);
  c.fill();
  // Yeux
  c.fillStyle = sombre;
  for (const x of [84, 172]) {
    c.beginPath();
    c.ellipse(x, 112, 15, 19, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ffffff';
  for (const x of [79, 167]) {
    c.beginPath();
    c.arc(x, 105, 5.5, 0, Math.PI * 2);
    c.fill();
  }
  // Joues roses
  c.fillStyle = 'rgba(255,140,150,0.55)';
  for (const x of [54, 202]) {
    c.beginPath();
    c.ellipse(x, 152, 15, 10, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Nez et bouche
  c.fillStyle = '#f08a9a';
  c.beginPath();
  c.moveTo(116, 148);
  c.lineTo(140, 148);
  c.lineTo(128, 162);
  c.closePath();
  c.fill();
  c.strokeStyle = sombre;
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(128, 162);
  c.quadraticCurveTo(126, 180, 110, 178);
  c.moveTo(128, 162);
  c.quadraticCurveTo(130, 180, 146, 178);
  c.stroke();
  // Moustaches
  c.lineWidth = 3.5;
  c.beginPath();
  for (const s of [-1, 1]) {
    c.moveTo(128 + s * 62, 160);
    c.lineTo(128 + s * 108, 150);
    c.moveTo(128 + s * 62, 172);
    c.lineTo(128 + s * 108, 178);
  }
  c.stroke();
  const texture = new THREE.CanvasTexture(canevas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let visagePartage: THREE.Texture | null = null;

/** Construit le modèle 3D d'un chat. `parties` donne accès aux membres pour l'animation. */
function construire(personnage: Personnage) {
  const a = APPARENCES[personnage];
  const racine = new THREE.Group();
  const corps = new THREE.Group(); // tout ce qui rebondit
  racine.add(corps);

  const pelage = new THREE.MeshStandardMaterial({ color: a.pelage, roughness: 0.9 });
  const fonce = new THREE.MeshStandardMaterial({ color: a.pelageFonce, roughness: 0.9 });
  const clair = new THREE.MeshStandardMaterial({ color: a.ventre, roughness: 0.9 });
  const accessoire = new THREE.MeshStandardMaterial({ color: a.couleurAccessoire, roughness: 0.8 });

  const tronc = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.26, 8, 18), pelage);
  tronc.position.y = 0.58;
  const ventre = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), clair);
  ventre.position.set(0, 0.54, 0.13);
  ventre.scale.set(1, 1.15, 0.75);

  // Jambes et bras : chacun dans un groupe placé à l'articulation, pour pouvoir les balancer.
  const membre = (rayon: number, long: number, x: number, y: number, materiau: THREE.Material) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const forme = new THREE.Mesh(new THREE.CapsuleGeometry(rayon, long, 6, 12), materiau);
    forme.position.y = -long / 2 - rayon * 0.4;
    pivot.add(forme);
    return pivot;
  };
  const jambeG = membre(0.095, 0.14, -0.13, 0.3, fonce);
  const jambeD = membre(0.095, 0.14, 0.13, 0.3, fonce);
  const brasG = membre(0.075, 0.2, -0.3, 0.78, pelage);
  const brasD = membre(0.075, 0.2, 0.3, 0.78, pelage);
  brasG.rotation.z = -0.25;
  brasD.rotation.z = 0.25;

  const tete = new THREE.Group();
  tete.position.y = 1.14;
  const crane = new THREE.Mesh(new THREE.SphereGeometry(0.37, 28, 22), pelage);
  crane.scale.set(1.1, 0.95, 1);
  // Le visage : une portion de sphère juste devant la tête, avec l'image dessus.
  visagePartage ??= textureVisage();
  const visage = new THREE.Mesh(
    new THREE.SphereGeometry(0.376, 24, 18, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.8, 1.6),
    new THREE.MeshStandardMaterial({ map: visagePartage, transparent: true, roughness: 0.9, depthWrite: false }),
  );
  visage.scale.copy(crane.scale);
  const geoOreille = new THREE.ConeGeometry(0.15, 0.27, 4);
  const geoInterieur = new THREE.ConeGeometry(0.085, 0.17, 4);
  const rose = new THREE.MeshStandardMaterial({ color: '#f6a9b5', roughness: 0.9 });
  for (const s of [-1, 1]) {
    const oreille = new THREE.Mesh(geoOreille, fonce);
    oreille.position.set(s * 0.24, 0.33, 0);
    oreille.rotation.z = -s * 0.28;
    oreille.rotation.y = Math.PI / 4;
    const interieur = new THREE.Mesh(geoInterieur, rose);
    interieur.position.set(s * 0.235, 0.31, 0.06);
    interieur.rotation.z = -s * 0.28;
    interieur.rotation.y = Math.PI / 4;
    tete.add(oreille, interieur);
  }
  tete.add(crane, visage);

  const queue = new THREE.Group();
  queue.position.set(0, 0.42, -0.24);
  const brin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.42, 6, 10), fonce);
  brin.position.set(0, 0.2, -0.12);
  brin.rotation.x = -0.55;
  queue.add(brin);

  if (a.accessoire === 'foulard') {
    const foulard = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.07, 10, 22), accessoire);
    foulard.position.y = 0.86;
    foulard.rotation.x = Math.PI / 2;
    const noeud = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), accessoire);
    noeud.position.set(0.12, 0.76, 0.2);
    noeud.rotation.z = 0.5;
    corps.add(foulard, noeud);
  } else {
    const fleur = new THREE.Group();
    fleur.position.set(0.27, 0.27, 0.13);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const petale = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), accessoire);
      petale.position.set(Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, 0);
      fleur.add(petale);
    }
    const coeur = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#f7d35b' }),
    );
    coeur.position.z = 0.03;
    fleur.add(coeur);
    tete.add(fleur);
  }

  // --- Les outils, attachés à la main droite ; un seul est visible à la fois ---
  const metal = new THREE.MeshStandardMaterial({ color: METAUX[0], roughness: 0.45, metalness: 0.35 });
  const boisOutil = new THREE.MeshStandardMaterial({ color: '#9a6a44', roughness: 0.9 });
  const osier = new THREE.MeshStandardMaterial({ color: '#cf9a5c', roughness: 0.95, side: THREE.DoubleSide });
  const toileSac = new THREE.MeshStandardMaterial({ color: '#ecd9b4', roughness: 0.95 });
  const main = new THREE.Group();
  main.position.set(0, -0.3, 0.04);
  brasD.add(main);

  const beche = new THREE.Group();
  const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 8), boisOutil);
  manche.position.y = -0.2;
  const fer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.035), metal);
  fer.position.y = -0.6;
  beche.add(manche, fer);

  const arrosoir = new THREE.Group();
  const cuve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.24, 14), metal);
  cuve.position.y = -0.14;
  const bec = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 8), metal);
  bec.position.set(0, -0.08, 0.24);
  bec.rotation.x = 1.0;
  const pomme = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.06, 10), metal);
  pomme.position.set(0, 0.0, 0.38);
  pomme.rotation.x = 1.0;
  arrosoir.add(cuve, bec, pomme);

  const panier = new THREE.Group();
  const fond = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), osier);
  fond.position.y = -0.04;
  fond.scale.y = 0.85;
  const bord = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), metal);
  bord.position.y = -0.04;
  bord.rotation.x = Math.PI / 2;
  panier.add(fond, bord);

  const graines = new THREE.Group();
  const sachet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), toileSac);
  sachet.position.y = -0.06;
  sachet.scale.set(1, 1.2, 0.8);
  graines.add(sachet);

  const outils: Record<OutilEnMain, THREE.Group> = { beche, arrosoir, panier, graines };
  for (const outil of Object.values(outils)) {
    outil.visible = false;
    main.add(outil);
  }

  corps.add(tronc, ventre, jambeG, jambeD, brasG, brasD, tete, queue);
  corps.traverse((o) => {
    o.castShadow = true;
  });
  visage.castShadow = false;

  return { racine, corps, jambeG, jambeD, brasG, brasD, tete, queue, outils, metal };
}

export interface Chat {
  objet: THREE.Group;
  /** Avance vers (x, z). Renvoie true quand le chat est arrivé. `hate` > 1 le fait courir. */
  avancerVers(x: number, z: number, dt: number, hate?: number): boolean;
  /** Tourne le chat vers (x, z) sans le déplacer. */
  regarderVers(x: number, z: number): void;
  /** Petit saut pour marquer un geste terminé. */
  sauter(): void;
  /** Met un outil dans la main du chat (null = les mains vides). Le niveau change la couleur du métal. */
  tenir(outil: OutilEnMain | null, niveau?: number): void;
  /** À appeler tant que le joueur frotte : le chat agite son outil. */
  travailler(): void;
  /** À appeler à chaque image. */
  animer(dt: number): void;
}

export function creerChat(personnage: Personnage): Chat {
  const m = construire(personnage);
  const objet = m.racine;

  let marche = false;
  let allure = 0; // 0 = à l'arrêt, 1 = en pleine marche (pour adoucir les transitions)
  let temps = 0;
  let tempsSaut = -1;
  let directionVoulue = 0;
  let enMain: OutilEnMain | null = null;
  let tempsTravail = 0;

  function regarderVers(x: number, z: number): void {
    const dx = x - objet.position.x;
    const dz = z - objet.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) directionVoulue = Math.atan2(dx, dz);
  }

  function avancerVers(x: number, z: number, dt: number, hate = 1): boolean {
    const dx = x - objet.position.x;
    const dz = z - objet.position.z;
    const distance = Math.hypot(dx, dz);
    const pas = VITESSE * hate * dt;
    if (distance <= pas) {
      objet.position.x = x;
      objet.position.z = z;
      marche = false;
      return true;
    }
    regarderVers(x, z);
    objet.position.x += (dx / distance) * pas;
    objet.position.z += (dz / distance) * pas;
    marche = true;
    return false;
  }

  function animer(dt: number): void {
    temps += dt;
    allure += ((marche ? 1 : 0) - allure) * Math.min(1, dt * 12);

    // Le chat se tourne en douceur vers sa direction.
    let ecart = directionVoulue - objet.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    objet.rotation.y += ecart * Math.min(1, dt * 14);

    // La marche : un balancement avec un petit rebond.
    const cycle = temps * 13;
    const balance = Math.sin(cycle) * allure;
    m.jambeG.rotation.x = balance * 0.9;
    m.jambeD.rotation.x = -balance * 0.9;
    m.brasG.rotation.x = -balance * 0.8;
    m.brasD.rotation.x = balance * 0.8;
    m.corps.rotation.z = balance * 0.07;
    let hauteur = Math.abs(Math.sin(cycle)) * 0.09 * allure;

    // À l'arrêt : il respire et remue la queue.
    const repos = 1 - allure;
    m.corps.scale.y = 1 + Math.sin(temps * 2.4) * 0.015 * repos;
    m.queue.rotation.z = Math.sin(temps * 3) * 0.35;
    m.tete.rotation.z = Math.sin(temps * 1.2) * 0.04 * repos;

    if (tempsSaut >= 0) {
      tempsSaut += dt;
      const t = tempsSaut / 0.28;
      if (t >= 1) tempsSaut = -1;
      else {
        hauteur += Math.sin(t * Math.PI) * 0.32;
        m.brasG.rotation.x = m.brasD.rotation.x = -Math.sin(t * Math.PI) * 1.6;
      }
    }
    // Un outil en main : le bras droit le tient devant lui, et l'agite quand le chat travaille.
    tempsTravail = Math.max(0, tempsTravail - dt);
    if (enMain && (allure < 0.5 || tempsTravail > 0)) {
      const force = Math.min(1, tempsTravail / 0.15);
      const repos = enMain === 'beche' ? -0.75 : -1.05;
      m.brasD.rotation.x = repos + Math.sin(temps * 19) * 0.5 * force;
      // L'arrosoir se penche pour verser.
      m.outils.arrosoir.rotation.x = 0.5 * force;
      m.tete.rotation.x = 0.12 * force;
    } else {
      m.tete.rotation.x = 0;
    }
    m.corps.position.y = hauteur;
  }

  return {
    objet,
    avancerVers,
    regarderVers,
    sauter: () => {
      tempsSaut = 0;
    },
    tenir(outil, niveau = 1) {
      enMain = outil;
      for (const [nom, objet] of Object.entries(m.outils)) objet.visible = nom === outil;
      m.metal.color.set(METAUX[Math.min(niveau, METAUX.length) - 1]);
    },
    travailler: () => {
      tempsTravail = 0.3;
    },
    animer,
  };
}

/** Fabrique un portrait du chat (une image), pour l'écran de choix du personnage. */
export function portraitChat(personnage: Personnage): string {
  const taille = 320;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(taille, taille, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#c9b79a', 1.3));
  const soleil = new THREE.DirectionalLight('#fff4d6', 2);
  soleil.position.set(-3, 6, 5);
  scene.add(soleil);
  const m = construire(personnage);
  m.racine.rotation.y = Math.PI / 4 + 0.35;
  scene.add(m.racine);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  camera.position.set(10, 8.9, 10);
  camera.lookAt(0, 0.82, 0);
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL();
  renderer.dispose();
  renderer.forceContextLoss();
  return image;
}
