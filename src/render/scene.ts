import * as THREE from 'three';
import { PAS } from '../game/terrain';
import type { Ambiance } from './ambiance';

// Dans cette vue, avancer de 1 le long de la diagonale du sol descend l'image de 0,816,
// et monter de 1 en hauteur la remonte de 0,816 aussi.
const PENTE = 0.816;

export interface Scene3D {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** Cadre la vue sur un terrain de cette taille (3 à 6). Le zoom glisse doucement. */
  cadrer(taille: number, toutDeSuite?: boolean): void;
  appliquerAmbiance(a: Ambiance): void;
  /** À appeler à chaque image. */
  animer(dt: number): void;
  render(): void;
}

export function creerScene(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Plafonné à 2 : au-delà, les téléphones chauffent pour un gain invisible.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a2d67e');

  // Caméra isométrique fixe : elle ne tourne jamais (les plantes sont des images plates).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);

  // Lumière : douce partout + soleil en haut à gauche de l'écran,
  // comme dans les règles des images générées.
  const ciel = new THREE.HemisphereLight('#ffffff', '#b7d89a', 1.15);
  scene.add(ciel);
  const soleil = new THREE.DirectionalLight('#fff4d6', 2.3);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  soleil.shadow.camera.left = -13;
  soleil.shadow.camera.right = 13;
  soleil.shadow.camera.top = 13;
  soleil.shadow.camera.bottom = -13;
  soleil.shadow.camera.far = 60;
  soleil.target.position.set(1.5, 0, 1.5);
  soleil.position.set(1.5 - 5, 14, 1.5 + 9);
  scene.add(soleil, soleil.target);

  // --- Cadrage : hauteur visible et point visé, selon la taille du terrain ---
  let hauteurVoulue = 7;
  let centreVoulu = 0;
  let hauteur = 7;
  let centre = 0;

  function calculerCadre(taille: number): void {
    const haut = 3.7; // de quoi voir le toit de la maison
    const bas = -PENTE * taille * PAS - 0.7;
    const ratio = window.innerWidth / window.innerHeight;
    const largeurUtile = taille * PAS * Math.SQRT2 + 6.5;
    hauteurVoulue = Math.max(haut - bas, largeurUtile / ratio);
    // Le point visé est sur la diagonale du champ.
    centreVoulu = -(haut + bas) / 2 / PENTE;
  }

  function appliquerCadre(): void {
    const ratio = window.innerWidth / window.innerHeight;
    camera.left = (-hauteur * ratio) / 2;
    camera.right = (hauteur * ratio) / 2;
    camera.top = hauteur / 2;
    camera.bottom = -hauteur / 2;
    camera.position.set(centre + 30, 30, centre + 30);
    camera.lookAt(centre, 0, centre);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  let tailleCadree = 3;
  function cadrer(taille: number, toutDeSuite = false): void {
    tailleCadree = taille;
    calculerCadre(taille);
    if (toutDeSuite) {
      hauteur = hauteurVoulue;
      centre = centreVoulu;
      appliquerCadre();
    }
  }

  function redimensionner(): void {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    cadrer(tailleCadree, true);
  }
  window.addEventListener('resize', redimensionner);
  redimensionner();

  return {
    scene,
    camera,
    cadrer,
    appliquerAmbiance(a) {
      soleil.color.copy(a.soleilCouleur);
      soleil.intensity = a.soleilIntensite;
      ciel.intensity = a.cielIntensite;
      (scene.background as THREE.Color).copy(a.sol);
    },
    animer(dt) {
      if (Math.abs(hauteur - hauteurVoulue) > 0.001 || Math.abs(centre - centreVoulu) > 0.001) {
        const k = Math.min(1, dt * 3);
        hauteur += (hauteurVoulue - hauteur) * k;
        centre += (centreVoulu - centre) * k;
        appliquerCadre();
      }
    },
    render: () => renderer.render(scene, camera),
  };
}
