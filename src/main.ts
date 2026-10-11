import * as THREE from 'three';
import './style.css';
import { acheterGraine, agirSurParcelle, dormir, vendreRecolte } from './game/actions';
import { nouvellePartie } from './game/state';
import { creerChat } from './render/chat';
import { creerMonde, LIMITE, parcelleSous, PORTE, positionParcelle } from './render/monde';
import { creerScene } from './render/scene';
import { creerHud } from './ui/hud';

// L'état du jeu : séparé de l'affichage (voir CLAUDE.md).
const state = nouvellePartie();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const { scene, camera, render } = creerScene(canvas);
const monde = creerMonde(scene, state);
const chat = creerChat();
chat.objet.position.set(PORTE.x, 0, PORTE.z);
chat.regarderVers(PORTE.x + 1, PORTE.z + 1);
scene.add(chat.objet);
const hud = creerHud();

/** À appeler après chaque changement de l'état : redessine le champ et les compteurs. */
function rafraichir(): void {
  monde.synchroniser(state);
  hud.mettreAJour(state);
}
rafraichir();

// --- Ce que le chat doit faire : une file d'endroits où aller, avec un geste à l'arrivée ---

interface Cible {
  x: number;
  z: number;
  /** Où regarder une fois arrivé. */
  regard?: { x: number; z: number };
  arrivee?: () => void;
}
let file: Cible[] = [];
let nuitEnCours = false;

function allerSurParcelle(index: number): void {
  const p = positionParcelle(index, state.tailleTerrain);
  file.push({
    // Le chat se place devant la parcelle (côté caméra) pour ne pas cacher la plante.
    x: p.x + 0.4,
    z: p.z + 0.4,
    regard: p,
    arrivee: () => {
      const resultat = agirSurParcelle(state, index);
      if (resultat.geste) chat.sauter();
      if (resultat.message) hud.message(resultat.message);
      rafraichir();
    },
  });
}

function allerDormir(): void {
  if (nuitEnCours) return;
  file = [
    {
      x: PORTE.x,
      z: PORTE.z,
      regard: { x: PORTE.x - 1, z: PORTE.z },
      arrivee: () => {
        nuitEnCours = true;
        void hud
          .nuit(() => {
            dormir(state);
            rafraichir();
            chat.regarderVers(PORTE.x + 1, PORTE.z + 1);
            return state.jour;
          })
          .then(() => {
            nuitEnCours = false;
          });
      },
    },
  ];
}

// --- Toucher l'écran (ou cliquer) ---

const rayon = new THREE.Raycaster();
const planSol = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointSol = new THREE.Vector3();
let depart: { x: number; y: number } | null = null;

canvas.addEventListener('pointerdown', (e) => {
  depart = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointerup', (e) => {
  if (!depart || nuitEnCours) return;
  const bouge = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
  depart = null;
  if (bouge > 12) return; // un glissement, pas un toucher

  const cadre = canvas.getBoundingClientRect();
  const souris = new THREE.Vector2(
    ((e.clientX - cadre.left) / cadre.width) * 2 - 1,
    -((e.clientY - cadre.top) / cadre.height) * 2 + 1,
  );
  rayon.setFromCamera(souris, camera);

  // Toucher la maison = aller se coucher.
  if (rayon.intersectObject(monde.maison, true).length > 0) {
    allerDormir();
    return;
  }

  if (!rayon.ray.intersectPlane(planSol, pointSol)) return;
  const index = parcelleSous(pointSol.x, pointSol.z, state.tailleTerrain);
  if (index !== null) {
    // Les touchers sur plusieurs parcelles s'enchaînent.
    allerSurParcelle(index);
  } else {
    // Toucher le sol : le chat y va, et oublie ce qui était prévu.
    file = [
      {
        x: THREE.MathUtils.clamp(pointSol.x, -LIMITE, LIMITE),
        z: THREE.MathUtils.clamp(pointSol.z, -LIMITE, LIMITE),
      },
    ];
  }
});

// --- Boutons ---

hud.surAcheter(() => {
  const resultat = acheterGraine(state);
  if (resultat.message) hud.message(resultat.message);
  rafraichir();
});

hud.surVendre(() => {
  const gain = vendreRecolte(state);
  if (gain > 0) hud.message(`Vendu : +${gain} pièces`);
  rafraichir();
});

hud.surDormir(allerDormir);

// En portrait, on conseille le paysage sans bloquer.
document.querySelector('#rotate-skip')!.addEventListener('click', () => {
  document.querySelector('#rotate')!.classList.add('ferme');
});

// --- Boucle d'affichage ---

const horloge = new THREE.Clock();
function boucle(): void {
  const dt = Math.min(horloge.getDelta(), 0.05);
  const cible = file[0];
  if (cible && !nuitEnCours) {
    if (chat.avancerVers(cible.x, cible.z, dt)) {
      file.shift();
      if (cible.regard) chat.regarderVers(cible.regard.x, cible.regard.z);
      cible.arrivee?.();
    }
  }
  chat.animer(dt);
  render();
  requestAnimationFrame(boucle);
}
boucle();
