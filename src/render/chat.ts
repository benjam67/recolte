// Le chat, en formes simples. Il sera remplacé par les deux chats définitifs en phase 2.

import * as THREE from 'three';

const VITESSE = 4; // cases par seconde

export interface Chat {
  objet: THREE.Group;
  /** Avance vers (x, z). Renvoie true quand le chat est arrivé. */
  avancerVers(x: number, z: number, dt: number): boolean;
  /** Tourne le chat vers (x, z) sans le déplacer. */
  regarderVers(x: number, z: number): void;
  /** Petit saut pour marquer un geste (bêcher, semer…). */
  sauter(): void;
  /** À appeler à chaque image. */
  animer(dt: number): void;
}

export function creerChat(): Chat {
  const objet = new THREE.Group();
  const corpsGroupe = new THREE.Group(); // tout ce qui rebondit
  objet.add(corpsGroupe);

  const gris = new THREE.MeshStandardMaterial({ color: '#a9a39b' });
  const grisFonce = new THREE.MeshStandardMaterial({ color: '#8b857d' });
  const noir = new THREE.MeshStandardMaterial({ color: '#2f2a26' });

  const corps = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.3, 6, 14), gris);
  corps.position.y = 0.45;

  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), gris);
  tete.position.y = 1.05;

  const geoOreille = new THREE.ConeGeometry(0.13, 0.24, 4);
  const oreilleG = new THREE.Mesh(geoOreille, grisFonce);
  oreilleG.position.set(-0.2, 1.4, 0);
  const oreilleD = new THREE.Mesh(geoOreille, grisFonce);
  oreilleD.position.set(0.2, 1.4, 0);

  const geoOeil = new THREE.SphereGeometry(0.05, 8, 8);
  const oeilG = new THREE.Mesh(geoOeil, noir);
  oeilG.position.set(-0.13, 1.1, 0.3);
  const oeilD = new THREE.Mesh(geoOeil, noir);
  oeilD.position.set(0.13, 1.1, 0.3);

  const queue = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), grisFonce);
  queue.position.set(0, 0.5, -0.32);
  queue.rotation.x = -0.7;

  corpsGroupe.add(corps, tete, oreilleG, oreilleD, oeilG, oeilD, queue);
  corpsGroupe.traverse((o) => {
    o.castShadow = true;
  });

  let marche = false;
  let tempsMarche = 0;
  let tempsSaut = -1;

  function regarderVers(x: number, z: number): void {
    const dx = x - objet.position.x;
    const dz = z - objet.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) objet.rotation.y = Math.atan2(dx, dz);
  }

  function avancerVers(x: number, z: number, dt: number): boolean {
    const dx = x - objet.position.x;
    const dz = z - objet.position.z;
    const distance = Math.hypot(dx, dz);
    const pas = VITESSE * dt;
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
    let hauteur = 0;
    let penche = 0;
    if (marche) {
      // La marche : un balancement avec un petit rebond.
      tempsMarche += dt;
      hauteur = Math.abs(Math.sin(tempsMarche * 12)) * 0.1;
      penche = Math.sin(tempsMarche * 12) * 0.12;
    } else {
      tempsMarche = 0;
    }
    if (tempsSaut >= 0) {
      tempsSaut += dt;
      const t = tempsSaut / 0.25;
      if (t >= 1) tempsSaut = -1;
      else hauteur += Math.sin(t * Math.PI) * 0.3;
    }
    corpsGroupe.position.y = hauteur;
    corpsGroupe.rotation.z = penche;
  }

  return {
    objet,
    avancerVers,
    regarderVers,
    sauter: () => {
      tempsSaut = 0;
    },
    animer,
  };
}
