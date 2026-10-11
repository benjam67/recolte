// Le décor : sol, parcelles, maison. Ce fichier lit l'état et dessine ; il ne le modifie jamais.

import * as THREE from 'three';
import { estMure } from '../game/actions';
import type { GameState } from '../game/state';

/** Distance entre deux parcelles voisines. */
const PAS = 1.15;
/** Centre du champ dans le monde. */
const CENTRE_CHAMP = { x: 1, z: 1 };

export const MAISON = { x: -3.5, z: 0 };
/** Là où le chat se tient pour entrer dans la maison. */
export const PORTE = { x: MAISON.x + 1.35, z: MAISON.z };
/** Demi-largeur du sol : le chat ne sort pas de là. */
export const LIMITE = 4.6;

const COULEURS = {
  herbe: '#8cc46b',
  terre: '#b08a5e',
  terreMouillee: '#6f5238',
};

export function positionParcelle(index: number, taille: number): { x: number; z: number } {
  const col = index % taille;
  const ligne = Math.floor(index / taille);
  const decalage = ((taille - 1) * PAS) / 2;
  return {
    x: CENTRE_CHAMP.x + col * PAS - decalage,
    z: CENTRE_CHAMP.z + ligne * PAS - decalage,
  };
}

/** Quelle parcelle se trouve à cet endroit du sol ? null s'il n'y en a pas. */
export function parcelleSous(x: number, z: number, taille: number): number | null {
  for (let i = 0; i < taille * taille; i++) {
    const p = positionParcelle(i, taille);
    if (Math.abs(x - p.x) <= PAS / 2 && Math.abs(z - p.z) <= PAS / 2) return i;
  }
  return null;
}

interface VueParcelle {
  sol: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  graine: THREE.Object3D;
  pousse: THREE.Object3D;
  mure: THREE.Object3D;
}

export interface Monde {
  /** La maison, pour savoir si le joueur a touché dessus. */
  maison: THREE.Object3D;
  /** Redessine les parcelles d'après l'état. À appeler après chaque changement. */
  synchroniser(state: GameState): void;
}

export function creerMonde(scene: THREE.Scene, state: GameState): Monde {
  // --- Sol ---
  const sol = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: '#9ccf7a' }),
  );
  sol.position.y = -0.2;
  sol.receiveShadow = true;
  scene.add(sol);

  // --- Maison ---
  const maison = new THREE.Group();
  const murs = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.3, 2),
    new THREE.MeshStandardMaterial({ color: '#f3e3c7' }),
  );
  murs.position.y = 0.65;
  const toit = new THREE.Mesh(
    new THREE.ConeGeometry(1.75, 1, 4),
    new THREE.MeshStandardMaterial({ color: '#d9775f' }),
  );
  toit.position.y = 1.8;
  toit.rotation.y = Math.PI / 4;
  const porte = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.8, 0.5),
    new THREE.MeshStandardMaterial({ color: '#8a5a3c' }),
  );
  porte.position.set(0.9, 0.4, 0);
  maison.add(murs, toit, porte);
  maison.position.set(MAISON.x, 0, MAISON.z);
  maison.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = true;
  });
  scene.add(maison);

  // --- Parcelles ---
  const vues: VueParcelle[] = [];
  const geoSol = new THREE.BoxGeometry(1, 0.08, 1);
  const matFeuille = new THREE.MeshStandardMaterial({ color: '#4f9d4a' });
  const matGraine = new THREE.MeshStandardMaterial({ color: '#e8d9a8' });
  const matRadis = new THREE.MeshStandardMaterial({ color: '#e0527a' });

  for (let i = 0; i < state.parcelles.length; i++) {
    const pos = positionParcelle(i, state.tailleTerrain);
    const groupe = new THREE.Group();
    groupe.position.set(pos.x, 0, pos.z);

    const solParcelle = new THREE.Mesh(geoSol, new THREE.MeshStandardMaterial({ color: COULEURS.herbe }));
    solParcelle.position.y = 0.04;
    solParcelle.receiveShadow = true;

    // Stade 0 : une petite graine posée sur la terre.
    const graine = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), matGraine);
    graine.position.y = 0.12;

    // Stades intermédiaires : une pousse verte.
    const pousse = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), matFeuille);
    pousse.position.y = 0.28;
    pousse.castShadow = true;

    // Mûr : le radis sort de terre, avec ses feuilles.
    const mure = new THREE.Group();
    const racine = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), matRadis);
    racine.position.y = 0.2;
    racine.castShadow = true;
    const feuilles = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), matFeuille);
    feuilles.position.y = 0.58;
    feuilles.castShadow = true;
    mure.add(racine, feuilles);

    groupe.add(solParcelle, graine, pousse, mure);
    scene.add(groupe);
    vues.push({ sol: solParcelle, graine, pousse, mure });
  }

  function synchroniser(s: GameState): void {
    s.parcelles.forEach((p, i) => {
      const vue = vues[i];
      if (!vue) return;
      const couleur = !p.bechee ? COULEURS.herbe : p.arrosee ? COULEURS.terreMouillee : COULEURS.terre;
      vue.sol.material.color.set(couleur);
      const mure = p.plante !== null && estMure(p.plante);
      vue.graine.visible = p.plante !== null && p.plante.stade === 0;
      vue.pousse.visible = p.plante !== null && p.plante.stade > 0 && !mure;
      vue.mure.visible = mure;
    });
  }
  synchroniser(state);

  return { maison, synchroniser };
}
