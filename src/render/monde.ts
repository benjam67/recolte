// Le décor : sol, parcelles, plantes, maison, atelier, décorations.
// Ce fichier lit l'état et dessine ; il ne le modifie jamais.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { estMure, stadeVisuel, type Geste } from '../game/actions';
import type { Saison } from '../game/reglages';
import { estActive, saisonDuJour, type GameState } from '../game/state';
import { ATELIER, MAISON, positionParcelle } from '../game/terrain';
import type { Ambiance } from './ambiance';
import { textureArbre, textureDeco, texturePlante } from './dessins';

const TERRE = new THREE.Color('#b08a5e');
const TERRE_MOUILLEE = new THREE.Color('#6f5238');

/** Les arbres du décor, sur les côtés (le chat n'y va pas). */
const ARBRES = [
  { x: -5.6, z: 1.6, t: 2.5 },
  { x: -6.4, z: 4.2, t: 2.9 },
  { x: -5.4, z: 6.6, t: 2.4 },
  { x: -7.2, z: -0.6, t: 2.7 },
  { x: -6.2, z: 9.2, t: 2.8 },
  { x: 1.6, z: -5.6, t: 2.6 },
  { x: 4.4, z: -6.4, t: 2.9 },
  { x: 6.8, z: -5.4, t: 2.4 },
  { x: -0.8, z: -7.0, t: 2.7 },
  { x: 9.4, z: -6.2, t: 2.8 },
];

/** Une image posée debout, face à la caméra, le pied au sol. */
function creerImageDebout(texture: THREE.Texture | null, taille: number): THREE.Sprite {
  const image = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, alphaTest: 0.08, depthWrite: true }),
  );
  image.center.set(0.5, 0.06);
  image.scale.setScalar(taille);
  return image;
}

/** Un geste en cours sur une parcelle : lequel, et où il en est (de 0 à 1). */
export type Chantier = Map<number, { geste: Geste; progres: number }>;

interface VueParcelle {
  groupe: THREE.Group;
  sol: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  /** Les trois sillons creusés par la bêche. */
  sillons: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
  /** Les trois graines posées dans la terre. */
  graines: THREE.Mesh[];
  plante: THREE.Sprite;
  ombre: THREE.Mesh;
  etat: 'herbe' | 'terre' | 'mouillee';
  /** 'vide', 'graines' (tout juste semé), 'pousse' ou 'mure'. */
  culture: 'vide' | 'graines' | 'pousse' | 'mure';
  /** Ce qui est affiché, pour repérer les changements. */
  cle: string;
  /** Petit rebond quand la plante change (de 1 à 0). */
  rebond: number;
}

export interface Monde {
  /** La maison et l'atelier, pour savoir si le joueur a touché dessus. */
  maison: THREE.Object3D;
  atelier: THREE.Object3D;
  /** Redessine d'après l'état. À appeler après chaque changement. */
  synchroniser(state: GameState): void;
  appliquerAmbiance(a: Ambiance): void;
  animer(dt: number): void;
}

function creerBatiment(couleurMurs: string, couleurToit: string, large: number, profond: number): THREE.Group {
  const groupe = new THREE.Group();
  const murs = new THREE.Mesh(
    new RoundedBoxGeometry(large, 1.4, profond, 4, 0.12),
    new THREE.MeshStandardMaterial({ color: couleurMurs }),
  );
  murs.position.y = 0.7;
  const toit = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(large, profond) * 0.82, 1.05, 4),
    new THREE.MeshStandardMaterial({ color: couleurToit, flatShading: true }),
  );
  toit.position.y = 1.9;
  toit.rotation.y = Math.PI / 4;
  toit.scale.set(large / Math.max(large, profond) + 0.08, 1, profond / Math.max(large, profond) + 0.08);
  groupe.add(murs, toit);
  return groupe;
}

export function creerMonde(scene: THREE.Scene, state: GameState, chantier: Chantier): Monde {
  const imagesDebout: THREE.SpriteMaterial[] = [];
  const suivre = (image: THREE.Sprite) => {
    imagesDebout.push(image.material);
    return image;
  };

  // --- Sol : assez grand pour remplir l'écran ---
  const matSol = new THREE.MeshStandardMaterial({ color: '#a2d67e' });
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), matSol);
  sol.rotation.x = -Math.PI / 2;
  sol.receiveShadow = true;
  scene.add(sol);

  // Des taches d'herbe plus foncée, pour que le sol ne soit pas uni.
  const matTache = new THREE.MeshStandardMaterial({ color: '#a2d67e' });
  const geoTache = new THREE.CircleGeometry(1, 20);
  let graine = 7;
  const hasard = () => (graine = (graine * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const tache = new THREE.Mesh(geoTache, matTache);
    tache.rotation.x = -Math.PI / 2;
    tache.position.set(hasard() * 30 - 12, 0.004, hasard() * 30 - 12);
    tache.scale.set(0.5 + hasard() * 1.1, 0.35 + hasard() * 0.6, 1);
    tache.receiveShadow = true;
    scene.add(tache);
  }

  // --- Maison ---
  const maison = creerBatiment('#f6e7cc', '#dd7a62', MAISON.demiX * 2, MAISON.demiZ * 2);
  const bois = new THREE.MeshStandardMaterial({ color: '#8a5a3c' });
  const vitre = new THREE.MeshStandardMaterial({ color: '#bfe6f5', emissive: '#ffd27a', emissiveIntensity: 0 });
  const porte = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.85, 0.52, 3, 0.03), bois);
  porte.position.set(MAISON.demiX, 0.43, 0);
  const fenetre = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.45, 0.08, 3, 0.03), vitre);
  fenetre.position.set(0, 0.8, MAISON.demiZ);
  const cheminee = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.7, 0.3, 3, 0.05), new THREE.MeshStandardMaterial({ color: '#c96a55' }));
  cheminee.position.set(-0.35, 2.0, -0.35);
  maison.add(porte, fenetre, cheminee);
  maison.position.set(MAISON.x, 0, MAISON.z);
  scene.add(maison);

  // --- Atelier (visible une fois acheté) ---
  const atelier = creerBatiment('#e6ecd9', '#6fa3c9', ATELIER.demiX * 2, ATELIER.demiZ * 2);
  const porteAtelier = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.85, 0.08, 3, 0.03), bois);
  porteAtelier.position.set(0, 0.43, ATELIER.demiZ);
  const enseigne = new THREE.Mesh(
    new RoundedBoxGeometry(0.7, 0.32, 0.08, 3, 0.03),
    new THREE.MeshStandardMaterial({ color: '#f3d35b' }),
  );
  enseigne.position.set(0, 1.12, ATELIER.demiZ + 0.02);
  const fenetreAtelier = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.45, 0.5, 3, 0.03), vitre);
  fenetreAtelier.position.set(ATELIER.demiX, 0.8, 0);
  atelier.add(porteAtelier, enseigne, fenetreAtelier);
  atelier.position.set(ATELIER.x, 0, ATELIER.z);
  scene.add(atelier);

  for (const batiment of [maison, atelier]) {
    batiment.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
  }

  // --- Ombre ronde sous les images debout ---
  const geoOmbre = new THREE.CircleGeometry(0.5, 20);
  const matOmbre = new THREE.MeshBasicMaterial({ color: '#1d2a14', transparent: true, opacity: 0.22, depthWrite: false });
  function creerOmbre(taille: number): THREE.Mesh {
    const ombre = new THREE.Mesh(geoOmbre, matOmbre);
    ombre.rotation.x = -Math.PI / 2;
    ombre.scale.set(taille, taille * 0.6, 1);
    return ombre;
  }

  // --- Arbres ---
  const arbres: THREE.Sprite[] = [];
  for (const a of ARBRES) {
    const arbre = suivre(creerImageDebout(null, a.t));
    arbre.position.set(a.x, 0, a.z);
    const ombre = creerOmbre(a.t * 0.55);
    ombre.position.set(a.x, 0.012, a.z);
    scene.add(arbre, ombre);
    arbres.push(arbre);
  }
  let saisonAffichee: Saison | null = null;

  // --- Parcelles ---
  const geoParcelle = new RoundedBoxGeometry(1, 0.1, 1, 3, 0.04);
  const geoSillon = new RoundedBoxGeometry(0.84, 0.05, 0.13, 2, 0.02);
  const geoGraine = new THREE.SphereGeometry(0.055, 10, 8);
  const matGraine = new THREE.MeshStandardMaterial({ color: '#f2e4b4' });
  const vues: VueParcelle[] = state.parcelles.map((_, i) => {
    const pos = positionParcelle(i);
    const groupe = new THREE.Group();
    groupe.position.set(pos.x, 0, pos.z);
    const solParcelle = new THREE.Mesh(geoParcelle, new THREE.MeshStandardMaterial({ color: '#8cc46b' }));
    solParcelle.position.y = 0.03;
    solParcelle.receiveShadow = true;
    groupe.add(solParcelle);

    const sillons = [-0.3, 0, 0.3].map((z) => {
      const sillon = new THREE.Mesh(geoSillon, new THREE.MeshStandardMaterial({ color: '#8f6d47' }));
      sillon.position.set(0, 0.075, z);
      sillon.receiveShadow = true;
      groupe.add(sillon);
      return sillon;
    });
    const graines = [
      [-0.22, -0.15],
      [0.04, 0.15],
      [0.26, -0.14],
    ].map(([x, z]) => {
      const graine = new THREE.Mesh(geoGraine, matGraine);
      graine.position.set(x, 0.13, z);
      graine.scale.y = 0.7;
      groupe.add(graine);
      return graine;
    });

    const plante = suivre(creerImageDebout(null, 1.05));
    plante.position.y = 0.08;
    plante.visible = false;
    const ombre = creerOmbre(0.62);
    ombre.position.y = 0.11;
    ombre.visible = false;
    groupe.add(ombre, plante);
    scene.add(groupe);
    return { groupe, sol: solParcelle, sillons, graines, plante, ombre, etat: 'herbe', culture: 'vide', cle: '', rebond: 0 };
  });

  // --- Décorations posées ---
  const groupeDecos = new THREE.Group();
  scene.add(groupeDecos);
  let cleDecos = '';

  function synchroniser(s: GameState): void {
    atelier.visible = s.atelier;

    const saison = saisonDuJour(s.jour);
    if (saison !== saisonAffichee) {
      saisonAffichee = saison;
      for (const arbre of arbres) arbre.material.map = textureArbre(saison);
    }

    s.parcelles.forEach((p, i) => {
      const vue = vues[i];
      vue.groupe.visible = estActive(s, i);
      if (!vue.groupe.visible) return;
      vue.etat = !p.bechee ? 'herbe' : p.arrosee ? 'mouillee' : 'terre';
      vue.culture = !p.plante ? 'vide' : p.plante.stade === 0 ? 'graines' : estMure(p.plante) ? 'mure' : 'pousse';

      const cle = p.plante ? `${p.plante.culture}:${stadeVisuel(p.plante)}` : '';
      if (cle !== vue.cle) {
        vue.cle = cle;
        // Tout juste semé, on voit les graines dans la terre ; l'image n'arrive qu'à la première pousse.
        vue.plante.visible = p.plante !== null && p.plante.stade > 0;
        vue.ombre.visible = vue.plante.visible;
        if (p.plante && p.plante.stade > 0) {
          vue.plante.material.map = texturePlante(p.plante.culture, stadeVisuel(p.plante));
          vue.rebond = 1;
        }
      }
    });

    const cle = JSON.stringify(s.decoPosees);
    if (cle !== cleDecos) {
      cleDecos = cle;
      // On retire les anciennes de la liste des images à teinter, puis on recrée tout.
      for (const enfant of groupeDecos.children) {
        if (enfant instanceof THREE.Sprite) imagesDebout.splice(imagesDebout.indexOf(enfant.material), 1);
      }
      groupeDecos.clear();
      for (const d of s.decoPosees) {
        const image = suivre(creerImageDebout(textureDeco(d.id), 1.1));
        image.position.set(d.x, 0, d.z);
        const ombre = creerOmbre(0.75);
        ombre.position.set(d.x, 0.012, d.z);
        groupeDecos.add(ombre, image);
      }
    }
  }
  synchroniser(state);

  const herbeParcelle = new THREE.Color();
  const sillonSec = new THREE.Color('#8f6d47');
  const sillonMouille = new THREE.Color('#58402a');
  let temps = 0;

  return {
    maison,
    atelier,
    synchroniser,

    appliquerAmbiance(a) {
      matSol.color.copy(a.sol);
      matTache.color.copy(a.sol).multiplyScalar(0.94);
      herbeParcelle.copy(a.sol).multiplyScalar(0.86);
      for (const materiau of imagesDebout) materiau.color.copy(a.teinte);
      // La nuit, les fenêtres s'allument.
      vitre.emissiveIntensity = Math.max(0, 1 - a.soleilIntensite / 1.2) * 1.6;

      // Les parcelles : leur état, plus le geste en cours qui fait évoluer la terre petit à petit.
      vues.forEach((vue, i) => {
        if (!vue.groupe.visible) return;
        const enCours = chantier.get(i);
        const couleur = vue.sol.material.color;
        let nbSillons = vue.etat === 'herbe' ? 0 : 3;
        let nbGraines = vue.culture === 'graines' ? 3 : 0;
        let humidite = vue.etat === 'mouillee' ? 1 : 0;
        let secousse = 0;

        couleur.copy(vue.etat === 'herbe' ? herbeParcelle : TERRE);
        if (enCours?.geste === 'becher' && vue.etat === 'herbe') {
          couleur.lerp(TERRE, enCours.progres);
          nbSillons = Math.floor(enCours.progres * 3.2);
        } else if (enCours?.geste === 'semer' && vue.culture === 'vide' && vue.etat !== 'herbe') {
          nbGraines = Math.floor(enCours.progres * 3.2);
        } else if (enCours?.geste === 'arroser' && vue.etat === 'terre') {
          humidite = enCours.progres;
        } else if (enCours?.geste === 'recolter' && vue.culture === 'mure') {
          secousse = enCours.progres;
        }
        couleur.lerp(TERRE_MOUILLEE, humidite);

        vue.sillons.forEach((sillon, n) => {
          sillon.visible = n < nbSillons;
          sillon.material.color.copy(sillonSec).lerp(sillonMouille, humidite);
        });
        vue.graines.forEach((graine, n) => (graine.visible = n < nbGraines));

        // À la récolte, la plante se secoue de plus en plus fort et sort de terre.
        vue.plante.material.rotation = secousse > 0 ? Math.sin(temps * 34) * 0.16 * secousse : 0;
        vue.plante.position.y = 0.08 + secousse * 0.14;
      });
    },

    animer(dt) {
      temps += dt;
      for (const vue of vues) {
        if (vue.rebond <= 0) continue;
        vue.rebond = Math.max(0, vue.rebond - dt * 4);
        const t = 1 - vue.rebond;
        // La plante jaillit un peu trop haut puis se repose.
        const echelle = 1 + Math.sin(t * Math.PI) * 0.25 * (1 - t);
        vue.plante.scale.set(1.05 * (2 - echelle), 1.05 * echelle, 1);
      }
    },
  };
}
