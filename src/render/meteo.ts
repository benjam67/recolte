// La pluie et la neige : des particules qui tombent autour de la ferme.

import * as THREE from 'three';
import type { Meteo } from '../game/reglages';

const LARGEUR = 26;
const HAUTEUR = 12;
const NB_GOUTTES = 260;
const NB_FLOCONS = 320;

export interface Particules {
  regler(meteo: Meteo): void;
  animer(dt: number): void;
}

export function creerParticules(scene: THREE.Scene): Particules {
  const groupe = new THREE.Group();
  groupe.position.set(2, 0, 2);
  scene.add(groupe);

  // --- Pluie : de petits traits obliques ---
  const pluiePos = new Float32Array(NB_GOUTTES * 6);
  const gouttes: { x: number; y: number; z: number; v: number }[] = [];
  for (let i = 0; i < NB_GOUTTES; i++) {
    gouttes.push({
      x: (Math.random() - 0.5) * LARGEUR,
      y: Math.random() * HAUTEUR,
      z: (Math.random() - 0.5) * LARGEUR,
      v: 13 + Math.random() * 5,
    });
  }
  const geoPluie = new THREE.BufferGeometry();
  geoPluie.setAttribute('position', new THREE.BufferAttribute(pluiePos, 3));
  const pluie = new THREE.LineSegments(
    geoPluie,
    new THREE.LineBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.7 }),
  );
  pluie.frustumCulled = false;

  // --- Neige : des points blancs qui se balancent ---
  const neigePos = new Float32Array(NB_FLOCONS * 3);
  const flocons: { x: number; y: number; z: number; v: number; phase: number }[] = [];
  for (let i = 0; i < NB_FLOCONS; i++) {
    flocons.push({
      x: (Math.random() - 0.5) * LARGEUR,
      y: Math.random() * HAUTEUR,
      z: (Math.random() - 0.5) * LARGEUR,
      v: 1 + Math.random() * 1.2,
      phase: Math.random() * 6.28,
    });
  }
  const geoNeige = new THREE.BufferGeometry();
  geoNeige.setAttribute('position', new THREE.BufferAttribute(neigePos, 3));
  const neige = new THREE.Points(
    geoNeige,
    new THREE.PointsMaterial({ color: '#ffffff', size: 5 * Math.min(window.devicePixelRatio, 2), sizeAttenuation: false }),
  );
  neige.frustumCulled = false;

  groupe.add(pluie, neige);
  pluie.visible = false;
  neige.visible = false;
  let temps = 0;

  return {
    regler(meteo) {
      pluie.visible = meteo === 'pluie';
      neige.visible = meteo === 'neige';
    },

    animer(dt) {
      temps += dt;
      if (pluie.visible) {
        gouttes.forEach((g, i) => {
          g.y -= g.v * dt;
          g.x -= g.v * dt * 0.12;
          if (g.y < 0) {
            g.y += HAUTEUR;
            g.x = (Math.random() - 0.5) * LARGEUR;
          }
          pluiePos.set([g.x, g.y, g.z, g.x + 0.05, g.y + 0.42, g.z], i * 6);
        });
        geoPluie.attributes.position.needsUpdate = true;
      }
      if (neige.visible) {
        flocons.forEach((f, i) => {
          f.y -= f.v * dt;
          if (f.y < 0) f.y += HAUTEUR;
          neigePos.set([f.x + Math.sin(temps * 1.3 + f.phase) * 0.3, f.y, f.z], i * 3);
        });
        geoNeige.attributes.position.needsUpdate = true;
      }
    },
  };
}
