import * as THREE from 'three';

// Hauteur du monde visible à l'écran, en unités de jeu (1 unité = 1 case).
const HAUTEUR_VISIBLE = 9;

export interface Scene3D {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  /** À appeler à chaque image. */
  render(): void;
}

export function creerScene(canvas: HTMLCanvasElement): Scene3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // Plafonné à 2 : au-delà, les téléphones chauffent pour un gain invisible.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe3f2');

  // Caméra isométrique fixe : elle ne tourne jamais (les plantes seront des images plates).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  // Lumière : douce partout + soleil en haut à gauche de l'écran,
  // comme dans les règles des images générées.
  scene.add(new THREE.HemisphereLight('#ffffff', '#b7d89a', 1.1));
  const soleil = new THREE.DirectionalLight('#fff4d6', 2.2);
  soleil.position.set(-2, 10, 6);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(1024, 1024);
  soleil.shadow.camera.left = -10;
  soleil.shadow.camera.right = 10;
  soleil.shadow.camera.top = 10;
  soleil.shadow.camera.bottom = -10;
  scene.add(soleil);

  function redimensionner(): void {
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    const ratio = largeur / hauteur;
    camera.left = (-HAUTEUR_VISIBLE * ratio) / 2;
    camera.right = (HAUTEUR_VISIBLE * ratio) / 2;
    camera.top = HAUTEUR_VISIBLE / 2;
    camera.bottom = -HAUTEUR_VISIBLE / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(largeur, hauteur, false);
  }
  window.addEventListener('resize', redimensionner);
  redimensionner();

  return {
    scene,
    camera,
    renderer,
    render: () => renderer.render(scene, camera),
  };
}
