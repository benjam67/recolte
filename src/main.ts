import * as THREE from 'three';
import './style.css';
import { nouvellePartie } from './game/state';
import { creerScene } from './render/scene';

// L'état du jeu : séparé de l'affichage (voir CLAUDE.md).
const state = nouvellePartie();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const { scene, render } = creerScene(canvas);

// --- Phase 0 : un sol et un cube, pour valider la vue isométrique sur téléphone ---

const sol = new THREE.Mesh(
  new THREE.BoxGeometry(8, 0.4, 8),
  new THREE.MeshStandardMaterial({ color: '#9ccf7a' }),
);
sol.position.y = -0.2;
sol.receiveShadow = true;
scene.add(sol);

// Un damier discret pour lire les cases.
const caseGeo = new THREE.PlaneGeometry(1, 1);
const caseMat = new THREE.MeshStandardMaterial({ color: '#8cc46b' });
for (let x = 0; x < 8; x++) {
  for (let z = 0; z < 8; z++) {
    if ((x + z) % 2 === 0) continue;
    const c = new THREE.Mesh(caseGeo, caseMat);
    c.rotation.x = -Math.PI / 2;
    c.position.set(x - 3.5, 0.001, z - 3.5);
    c.receiveShadow = true;
    scene.add(c);
  }
}

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 1.4, 1.4),
  new THREE.MeshStandardMaterial({ color: '#f2a65a' }),
);
cube.castShadow = true;
scene.add(cube);

const badge = document.querySelector<HTMLDivElement>('#badge')!;
badge.textContent = `Phase 0 · jour ${state.jour} · ${state.saison}`;

// En portrait, on conseille le paysage sans bloquer.
document.querySelector('#rotate-skip')!.addEventListener('click', () => {
  document.querySelector('#rotate')!.classList.add('ferme');
});

const horloge = new THREE.Clock();
function boucle(): void {
  const t = horloge.getElapsedTime();
  cube.position.y = 1 + Math.sin(t * 2) * 0.15;
  cube.rotation.y = t * 0.6;
  render();
  requestAnimationFrame(boucle);
}
boucle();
