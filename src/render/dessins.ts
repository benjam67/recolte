// Les images du jeu, dessinées par le code en attendant les vraies images générées.
// Quand les images fal.ai seront prêtes, c'est ce fichier qui changera : au lieu de dessiner,
// `canevasPlante`, `canevasDeco`, etc. chargeront les fichiers PNG. Le reste du jeu ne verra pas la différence.
//
// Mêmes règles que pour les images générées : format carré, sujet centré, fond transparent,
// lumière en haut à gauche, pas d'ombre au sol.

import * as THREE from 'three';
import type { CultureId, DecoId, RecetteId, Saison } from '../game/reglages';

const T = 128;
const TAU = Math.PI * 2;
const TRAIT = '#4a3524';
const VERT_TIGE = '#5c9c4a';
const BOIS = '#9a6a44';

type C = CanvasRenderingContext2D;

function toile(dessiner: (c: C) => void): HTMLCanvasElement {
  const canevas = document.createElement('canvas');
  canevas.width = canevas.height = T;
  const c = canevas.getContext('2d')!;
  c.lineWidth = 4;
  c.strokeStyle = TRAIT;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  dessiner(c);
  return canevas;
}

// --- Petits outils de dessin : chaque forme est remplie puis cernée d'un trait brun ---

function ellipse(c: C, couleur: string, x: number, y: number, rx: number, ry = rx, rotation = 0): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rotation, 0, TAU);
  c.fillStyle = couleur;
  c.fill();
  c.stroke();
}

function polygone(c: C, couleur: string, points: number[]): void {
  c.beginPath();
  c.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]);
  c.closePath();
  c.fillStyle = couleur;
  c.fill();
  c.stroke();
}

function rectangle(c: C, couleur: string, x: number, y: number, l: number, h: number, rayon = 4): void {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, l, h, rayon);
  else c.rect(x, y, l, h);
  c.fillStyle = couleur;
  c.fill();
  c.stroke();
}

/** Un trait épais et coloré, cerné de brun (tiges, branches). */
function tige(c: C, couleur: string, x1: number, y1: number, x2: number, y2: number, epaisseur = 5): void {
  c.save();
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineWidth = epaisseur + 6;
  c.stroke();
  c.lineWidth = epaisseur;
  c.strokeStyle = couleur;
  c.stroke();
  c.restore();
}

/** Une feuille qui part du point (x, y). Angle 0 = vers le haut, positif = vers la droite. */
function feuille(c: C, couleur: string, x: number, y: number, angle: number, long: number, large: number): void {
  const a = (angle * Math.PI) / 180;
  ellipse(c, couleur, x + (Math.sin(a) * long) / 2, y - (Math.cos(a) * long) / 2, large / 2, long / 2, a);
}

/** Un petit reflet clair, en haut à gauche de la forme. */
function reflet(c: C, x: number, y: number, r: number): void {
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(x, y, r, r * 0.6, -0.6, 0, TAU);
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------- Cultures

type Port = 'touffe' | 'tige' | 'rampant' | 'arbuste' | 'poireau';
type Produit = 'rond' | 'gros' | 'radis' | 'fraise' | 'grappe' | 'fleur' | 'tulipe' | 'clochette' | 'poireau';

interface DessinCulture {
  port: Port;
  produit: Produit;
  feuille: string;
  couleur: string;
  couleur2?: string;
  petales?: number;
}

const DESSINS: Record<CultureId, DessinCulture> = {
  radis: { port: 'touffe', produit: 'radis', feuille: '#6dba55', couleur: '#e8557f' },
  tulipe: { port: 'tige', produit: 'tulipe', feuille: '#63b35a', couleur: '#f0597a' },
  fraise: { port: 'touffe', produit: 'fraise', feuille: '#4fa457', couleur: '#e33d4d' },
  tomate: { port: 'arbuste', produit: 'rond', feuille: '#5aa84f', couleur: '#e8452f' },
  tournesol: { port: 'tige', produit: 'fleur', feuille: '#5aa84f', couleur: '#f7c531', couleur2: '#7a4a25', petales: 12 },
  melon: { port: 'rampant', produit: 'gros', feuille: '#63b35a', couleur: '#c9d98a', couleur2: '#a9bd66' },
  dahlia: { port: 'tige', produit: 'fleur', feuille: '#4f9d57', couleur: '#f08a4b', couleur2: '#f7d35b', petales: 10 },
  raisin: { port: 'arbuste', produit: 'grappe', feuille: '#6aa84f', couleur: '#8a5bc7' },
  citrouille: { port: 'rampant', produit: 'gros', feuille: '#5aa84f', couleur: '#f08c2e', couleur2: '#c96a1b' },
  perceneige: { port: 'tige', produit: 'clochette', feuille: '#5fae7a', couleur: '#ffffff' },
  poireau: { port: 'poireau', produit: 'poireau', feuille: '#4f9d6a', couleur: '#f3f1e4' },
  clementine: { port: 'arbuste', produit: 'rond', feuille: '#3f8f52', couleur: '#f79a2e' },
};

function teteDeFleur(c: C, d: DessinCulture, x: number, y: number, r: number): void {
  if (d.produit === 'tulipe') {
    c.beginPath();
    c.moveTo(x - r * 0.75, y - r * 0.75);
    c.lineTo(x - r * 0.3, y - r * 0.25);
    c.lineTo(x, y - r * 0.9);
    c.lineTo(x + r * 0.3, y - r * 0.25);
    c.lineTo(x + r * 0.75, y - r * 0.75);
    c.quadraticCurveTo(x + r, y + r * 0.9, x, y + r * 0.9);
    c.quadraticCurveTo(x - r, y + r * 0.9, x - r * 0.75, y - r * 0.75);
    c.fillStyle = d.couleur;
    c.fill();
    c.stroke();
    reflet(c, x - r * 0.3, y + r * 0.1, r * 0.25);
  } else if (d.produit === 'clochette') {
    ellipse(c, d.couleur, x + r * 0.45, y + r * 0.75, r * 0.5, r * 0.75, 0.25);
    ellipse(c, d.feuille, x + r * 0.3, y + r * 0.05, r * 0.28, r * 0.22);
  } else {
    const n = d.petales ?? 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      ellipse(c, d.couleur, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72, r * 0.36);
    }
    ellipse(c, d.couleur2 ?? '#f7d35b', x, y, r * 0.5);
  }
}

function fruitRond(c: C, couleur: string, x: number, y: number, r: number): void {
  ellipse(c, couleur, x, y, r);
  reflet(c, x - r * 0.35, y - r * 0.35, r * 0.3);
}

function grappe(c: C, couleur: string, x: number, y: number, r: number): void {
  const rangs = [
    [-1, 0],
    [0, 0],
    [1, 0],
    [-0.5, 0.85],
    [0.5, 0.85],
    [0, 1.7],
  ];
  for (const [dx, dy] of rangs) ellipse(c, couleur, x + dx * r * 1.7, y + dy * r * 1.7, r);
}

/** Dessine une plante à l'un de ses 4 stades (0 = graines, 3 = mûre). Le pied est en bas au centre. */
function dessinerPlante(c: C, d: DessinCulture, stade: number): void {
  const x = 64;
  const sol = 120;

  if (stade === 0) {
    for (const [dx, dy] of [
      [-16, -4],
      [0, -10],
      [16, -3],
    ]) {
      ellipse(c, '#e8d9a8', x + dx, sol + dy, 6, 5);
    }
    return;
  }
  if (stade === 1) {
    tige(c, VERT_TIGE, x, sol, x, sol - 22);
    feuille(c, d.feuille, x, sol - 20, -55, 30, 16);
    feuille(c, d.feuille, x, sol - 20, 55, 30, 16);
    return;
  }

  const mure = stade >= 3;
  switch (d.port) {
    case 'touffe': {
      const long = mure ? 54 : 42;
      for (const a of [-68, 68, -34, 34, 0]) feuille(c, d.feuille, x, sol - 6, a, long * (a === 0 ? 1 : 0.88), 20);
      if (mure && d.produit === 'radis') {
        ellipse(c, d.couleur, x, sol - 8, 21, 15);
        reflet(c, x - 8, sol - 13, 6);
      }
      if (mure && d.produit === 'fraise') {
        for (const [dx, dy] of [
          [-26, -16],
          [24, -18],
          [0, -6],
        ]) {
          ellipse(c, d.couleur, x + dx, sol + dy, 10, 12);
          reflet(c, x + dx - 3, sol + dy - 4, 3);
        }
      }
      break;
    }
    case 'tige': {
      const haut = mure ? 38 : 62;
      tige(c, VERT_TIGE, x, sol, x, haut + 8, 6);
      feuille(c, d.feuille, x, sol - 16, -58, 36, 15);
      feuille(c, d.feuille, x, sol - 30, 58, 36, 15);
      if (mure) teteDeFleur(c, d, x, haut, 24);
      else ellipse(c, d.feuille, x, haut + 4, 9, 13);
      break;
    }
    case 'rampant': {
      ellipse(c, d.feuille, 28, sol - 16, 24, 15, -0.35);
      ellipse(c, d.feuille, 100, sol - 16, 24, 15, 0.35);
      ellipse(c, d.feuille, x, sol - 30, 24, 16);
      if (mure) {
        ellipse(c, d.couleur, x, sol - 26, 34, 27);
        if (d.couleur2) {
          c.save();
          c.strokeStyle = d.couleur2;
          c.lineWidth = 3;
          c.beginPath();
          c.ellipse(x, sol - 26, 15, 25, 0, 0, TAU);
          c.stroke();
          c.restore();
        }
        reflet(c, x - 14, sol - 38, 8);
        rectangle(c, VERT_TIGE, x - 4, sol - 62, 8, 12, 3);
      } else {
        ellipse(c, d.feuille, x, sol - 12, 22, 13);
        ellipse(c, '#f7d35b', x + 20, sol - 34, 7);
      }
      break;
    }
    case 'arbuste': {
      tige(c, BOIS, x, sol, x, sol - 26, 8);
      if (mure) {
        ellipse(c, d.feuille, 42, 74, 25);
        ellipse(c, d.feuille, 86, 74, 25);
        ellipse(c, d.feuille, x, 52, 29);
        if (d.produit === 'grappe') {
          grappe(c, d.couleur, 44, 66, 6);
          grappe(c, d.couleur, 84, 58, 6);
        } else {
          for (const [fx, fy] of [
            [38, 78],
            [64, 86],
            [90, 76],
            [52, 52],
            [78, 46],
          ]) {
            fruitRond(c, d.couleur, fx, fy, 9);
          }
        }
      } else {
        ellipse(c, d.feuille, 48, 84, 19);
        ellipse(c, d.feuille, 80, 84, 19);
        ellipse(c, d.feuille, x, 68, 22);
      }
      break;
    }
    case 'poireau': {
      const long = mure ? 62 : 40;
      const base = mure ? 44 : 26;
      feuille(c, d.feuille, x, sol - base + 8, -30, long, 17);
      feuille(c, d.feuille, x, sol - base + 8, 30, long, 17);
      feuille(c, d.feuille, x, sol - base + 8, 0, long * 1.1, 17);
      rectangle(c, d.couleur, x - 9, sol - base, 18, base, 7);
      break;
    }
  }
}

/** L'icône du produit récolté, pour les menus. */
function dessinerProduit(c: C, d: DessinCulture): void {
  switch (d.produit) {
    case 'rond':
      tige(c, BOIS, 64, 40, 64, 26, 5);
      feuille(c, d.feuille, 64, 36, 62, 30, 15);
      fruitRond(c, d.couleur, 64, 74, 38);
      break;
    case 'gros':
      rectangle(c, VERT_TIGE, 58, 22, 12, 18, 4);
      ellipse(c, d.couleur, 64, 76, 48, 40);
      if (d.couleur2) {
        c.save();
        c.strokeStyle = d.couleur2;
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(64, 76, 22, 38, 0, 0, TAU);
        c.stroke();
        c.restore();
      }
      reflet(c, 42, 56, 11);
      break;
    case 'radis':
      for (const a of [-34, 34, 0]) feuille(c, d.feuille, 64, 56, a, 44, 18);
      polygone(c, '#fff6f0', [54, 96, 74, 96, 64, 120]);
      ellipse(c, d.couleur, 64, 78, 29, 27);
      reflet(c, 52, 68, 8);
      break;
    case 'fraise':
      c.beginPath();
      c.moveTo(64, 116);
      c.quadraticCurveTo(14, 78, 30, 46);
      c.quadraticCurveTo(64, 26, 98, 46);
      c.quadraticCurveTo(114, 78, 64, 116);
      c.fillStyle = d.couleur;
      c.fill();
      c.stroke();
      c.fillStyle = '#f9e08a';
      for (const [gx, gy] of [
        [46, 62],
        [64, 70],
        [82, 62],
        [54, 84],
        [74, 84],
        [64, 98],
      ]) {
        c.beginPath();
        c.ellipse(gx, gy, 3, 4, 0, 0, TAU);
        c.fill();
      }
      for (const a of [-72, 72, 0]) feuille(c, d.feuille, 64, 44, a, 28, 16);
      break;
    case 'grappe':
      tige(c, BOIS, 64, 40, 64, 18, 5);
      feuille(c, d.feuille, 64, 30, 68, 34, 20);
      grappe(c, d.couleur, 64, 52, 13);
      break;
    case 'poireau':
      c.save();
      c.translate(64, 64);
      c.rotate(0.6);
      feuille(c, d.feuille, 0, 4, -24, 60, 17);
      feuille(c, d.feuille, 0, 4, 24, 60, 17);
      feuille(c, d.feuille, 0, 4, 0, 66, 17);
      rectangle(c, d.couleur, -10, 0, 20, 54, 8);
      c.restore();
      break;
    default:
      // Les fleurs : une tête, une tige, une feuille.
      tige(c, VERT_TIGE, 64, 120, 64, 60, 6);
      feuille(c, d.feuille, 64, 98, 60, 38, 16);
      teteDeFleur(c, d, 64, d.produit === 'clochette' ? 36 : 48, d.produit === 'clochette' ? 38 : 32);
  }
}

// ---------------------------------------------------------------- Recettes

const DESSINS_RECETTES: Record<RecetteId, (c: C) => void> = {
  jus(c) {
    tige(c, '#e8557f', 78, 14, 68, 60, 4);
    polygone(c, '#f6a04d', [36, 40, 92, 40, 82, 116, 46, 116]);
    reflet(c, 52, 60, 7);
  },
  confiture(c) {
    rectangle(c, '#d9486b', 32, 48, 64, 68, 12);
    rectangle(c, '#fff6e6', 44, 68, 40, 26, 4);
    rectangle(c, '#f3d35b', 30, 30, 68, 22, 6);
  },
  bocal(c) {
    rectangle(c, '#cfe8c9', 32, 44, 64, 72, 12);
    for (const [x, y, k] of [
      [50, 66, '#f08c2e'],
      [76, 74, '#e8452f'],
      [56, 94, '#6dba55'],
      [80, 98, '#f08c2e'],
    ] as const) {
      ellipse(c, k, x, y, 10);
    }
    rectangle(c, '#b8b4ac', 30, 28, 68, 20, 6);
  },
  soupe(c) {
    c.save();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    for (const x of [48, 64, 80]) {
      c.beginPath();
      c.moveTo(x, 44);
      c.quadraticCurveTo(x + 8, 34, x, 24);
      c.stroke();
    }
    c.restore();
    c.beginPath();
    c.arc(64, 66, 46, 0, Math.PI);
    c.closePath();
    c.fillStyle = '#f3e3c7';
    c.fill();
    c.stroke();
    ellipse(c, '#ee9a4a', 64, 66, 46, 12);
  },
  sachet(c) {
    polygone(c, '#ecd9b4', [42, 48, 86, 48, 98, 116, 30, 116]);
    polygone(c, '#ecd9b4', [44, 48, 84, 48, 92, 26, 36, 26]);
    rectangle(c, '#d9486b', 40, 42, 48, 10, 4);
    ellipse(c, '#c79be0', 64, 86, 12);
    ellipse(c, '#f7d35b', 64, 86, 5);
  },
  bouquet(c) {
    polygone(c, '#f3e3c7', [34, 66, 94, 66, 64, 122]);
    for (const [x, y, k] of [
      [40, 46, '#f0597a'],
      [88, 46, '#f7c531'],
      [64, 32, '#f08a4b'],
      [64, 58, '#ffffff'],
    ] as const) {
      ellipse(c, k, x, y, 17);
      ellipse(c, '#f7e9a8', x, y, 6);
    }
  },
};

// ---------------------------------------------------------------- Outils

type OutilDessine = 'beche' | 'arrosoir' | 'panier' | 'graines';
/** La couleur du métal selon le niveau : fer, argent, or. */
const METAUX = ['#a9b0b8', '#cfe6f7', '#f5c542'];

function dessinerOutil(c: C, outil: OutilDessine, niveau: number): void {
  const metal = METAUX[Math.min(niveau, METAUX.length) - 1];
  switch (outil) {
    case 'beche':
      c.save();
      c.translate(64, 64);
      c.rotate(0.6);
      rectangle(c, BOIS, -5, -56, 10, 70, 4);
      rectangle(c, BOIS, -16, -62, 32, 10, 4);
      rectangle(c, metal, -19, 10, 38, 46, 9);
      c.restore();
      reflet(c, 40, 92, 6);
      break;
    case 'arrosoir':
      polygone(c, metal, [84, 66, 116, 36, 122, 44, 88, 88]);
      ellipse(c, metal, 120, 38, 9, 6, 0.8);
      c.save();
      c.lineWidth = 9;
      c.beginPath();
      c.arc(34, 78, 22, Math.PI * 0.5, Math.PI * 1.5);
      c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = metal;
      c.stroke();
      c.restore();
      rectangle(c, metal, 32, 48, 56, 62, 10);
      ellipse(c, '#7fb6e6', 60, 50, 26, 7);
      reflet(c, 46, 70, 7);
      break;
    case 'panier':
      c.save();
      c.lineWidth = 9;
      c.beginPath();
      c.arc(64, 62, 36, Math.PI, 0);
      c.stroke();
      c.lineWidth = 3;
      c.strokeStyle = '#cf9a5c';
      c.stroke();
      c.restore();
      c.beginPath();
      c.moveTo(18, 62);
      c.quadraticCurveTo(24, 116, 64, 116);
      c.quadraticCurveTo(104, 116, 110, 62);
      c.closePath();
      c.fillStyle = '#cf9a5c';
      c.fill();
      c.stroke();
      c.save();
      c.lineWidth = 3;
      c.beginPath();
      for (const x of [40, 64, 88]) {
        c.moveTo(x, 70);
        c.lineTo(x, 112);
      }
      c.moveTo(24, 88);
      c.lineTo(104, 88);
      c.stroke();
      c.restore();
      rectangle(c, metal, 14, 56, 100, 12, 5);
      break;
    case 'graines':
      polygone(c, '#ecd9b4', [38, 44, 90, 44, 100, 118, 28, 118]);
      polygone(c, '#ecd9b4', [40, 44, 88, 44, 96, 20, 32, 20]);
      rectangle(c, '#6dba55', 36, 38, 56, 10, 4);
      for (const [x, y] of [
        [52, 76],
        [74, 80],
        [62, 98],
      ]) {
        ellipse(c, '#f2e4b4', x, y, 7, 5, 0.4);
      }
      break;
  }
}

// ---------------------------------------------------------------- Décorations

function potDeFleurs(c: C, couleur: string): void {
  for (const [x, y] of [
    [44, 50],
    [84, 50],
    [64, 34],
  ]) {
    tige(c, VERT_TIGE, x, y, 64, 88, 4);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ellipse(c, couleur, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 6);
    }
    ellipse(c, '#f7d35b', x, y, 6);
  }
  polygone(c, '#c9744f', [38, 84, 90, 84, 82, 122, 46, 122]);
  rectangle(c, '#d98a63', 34, 78, 60, 12, 4);
}

const DESSINS_DECOS: Record<DecoId, (c: C) => void> = {
  cloture(c) {
    rectangle(c, '#e9dcc0', 8, 76, 112, 10, 3);
    rectangle(c, '#e9dcc0', 8, 100, 112, 10, 3);
    for (const x of [16, 52, 88]) polygone(c, '#f6ecd6', [x, 122, x, 64, x + 12, 50, x + 24, 64, x + 24, 122]);
  },
  pot_rouge: (c) => potDeFleurs(c, '#e8455a'),
  pot_bleu: (c) => potDeFleurs(c, '#5f8fe0'),
  rocher(c) {
    polygone(c, '#b4b2ac', [18, 122, 26, 86, 54, 66, 92, 76, 110, 122]);
    polygone(c, '#c9c7c1', [40, 122, 46, 98, 70, 90, 84, 122]);
    reflet(c, 52, 80, 9);
  },
  buisson(c) {
    ellipse(c, '#5aa84f', 38, 94, 28, 26);
    ellipse(c, '#5aa84f', 92, 96, 26, 24);
    ellipse(c, '#63b35a', 64, 78, 32, 30);
    for (const [x, y] of [
      [44, 86],
      [70, 66],
      [90, 92],
      [60, 98],
    ]) {
      ellipse(c, '#f7a6c4', x, y, 7);
    }
  },
  panneau(c) {
    rectangle(c, BOIS, 59, 66, 10, 56, 3);
    rectangle(c, '#ecd29e', 22, 30, 84, 44, 6);
    c.save();
    c.lineWidth = 3;
    for (const y of [44, 58]) {
      c.beginPath();
      c.moveTo(36, y);
      c.lineTo(92, y);
      c.stroke();
    }
    c.restore();
  },
  tonneau(c) {
    rectangle(c, '#b98558', 34, 50, 60, 72, 14);
    rectangle(c, '#6b6b76', 32, 64, 64, 8, 3);
    rectangle(c, '#6b6b76', 32, 100, 64, 8, 3);
    reflet(c, 48, 82, 7);
  },
  foin(c) {
    rectangle(c, '#ecc95a', 18, 66, 92, 56, 16);
    c.save();
    c.strokeStyle = '#c79a3a';
    c.lineWidth = 3;
    for (const x of [46, 82]) {
      c.beginPath();
      c.moveTo(x, 68);
      c.lineTo(x, 120);
      c.stroke();
    }
    c.restore();
  },
  banc(c) {
    rectangle(c, BOIS, 24, 92, 10, 30, 3);
    rectangle(c, BOIS, 94, 92, 10, 30, 3);
    rectangle(c, '#c9925f', 14, 50, 100, 18, 5);
    rectangle(c, '#c9925f', 14, 78, 100, 16, 5);
  },
  boite(c) {
    rectangle(c, BOIS, 59, 66, 10, 56, 3);
    rectangle(c, '#f3d35b', 88, 26, 8, 26, 3);
    rectangle(c, '#e0526e', 34, 38, 60, 34, 14);
    rectangle(c, '#fff6e6', 46, 50, 22, 6, 2);
  },
  lanterne(c) {
    rectangle(c, '#5b5b66', 59, 46, 10, 76, 3);
    rectangle(c, '#ffe28a', 44, 20, 40, 34, 6);
    polygone(c, '#5b5b66', [38, 22, 90, 22, 64, 4]);
    reflet(c, 56, 32, 6);
  },
  nichoir(c) {
    rectangle(c, BOIS, 60, 70, 8, 52, 3);
    rectangle(c, '#f6ecd6', 40, 38, 48, 38, 4);
    polygone(c, '#5f8fc9', [32, 42, 96, 42, 64, 14]);
    ellipse(c, TRAIT, 64, 56, 7);
  },
  sapin(c) {
    rectangle(c, BOIS, 57, 102, 14, 20, 3);
    polygone(c, '#3f8f52', [24, 106, 104, 106, 64, 60]);
    polygone(c, '#4a9d5c', [32, 80, 96, 80, 64, 38]);
    polygone(c, '#57ab66', [42, 54, 86, 54, 64, 12]);
  },
  epouvantail(c) {
    rectangle(c, BOIS, 60, 60, 8, 62, 3);
    rectangle(c, BOIS, 20, 56, 88, 8, 3);
    polygone(c, '#5f8fc9', [42, 52, 86, 52, 90, 98, 38, 98]);
    ellipse(c, '#f0d9a0', 64, 36, 18);
    polygone(c, '#b98558', [36, 28, 92, 28, 76, 6, 52, 6]);
    c.save();
    c.fillStyle = TRAIT;
    for (const x of [58, 70]) {
      c.beginPath();
      c.arc(x, 38, 2.5, 0, TAU);
      c.fill();
    }
    c.restore();
  },
  puits(c) {
    rectangle(c, BOIS, 32, 32, 8, 50, 3);
    rectangle(c, BOIS, 88, 32, 8, 50, 3);
    polygone(c, '#d9775f', [18, 38, 110, 38, 64, 8]);
    rectangle(c, '#c2beb6', 26, 76, 76, 46, 8);
    c.save();
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(28, 98);
    c.lineTo(100, 98);
    c.moveTo(52, 78);
    c.lineTo(52, 98);
    c.moveTo(76, 98);
    c.lineTo(76, 120);
    c.stroke();
    c.restore();
  },
};

// ---------------------------------------------------------------- Arbres du décor

const FEUILLAGES: Record<Saison, string[] | null> = {
  printemps: ['#8ccf7a', '#f7b8d0'],
  ete: ['#5fae58', '#6fbd62'],
  automne: ['#e8913c', '#f0b24a'],
  hiver: null,
};

function dessinerArbre(c: C, saison: Saison): void {
  const couleurs = FEUILLAGES[saison];
  tige(c, BOIS, 64, 122, 64, 70, 12);
  if (!couleurs) {
    // Hiver : des branches nues et un peu de neige.
    tige(c, BOIS, 64, 84, 36, 50, 7);
    tige(c, BOIS, 64, 80, 94, 46, 7);
    tige(c, BOIS, 64, 72, 64, 30, 7);
    for (const [x, y] of [
      [36, 46],
      [94, 42],
      [64, 26],
    ]) {
      ellipse(c, '#f4f8fa', x, y, 13, 9);
    }
    return;
  }
  ellipse(c, couleurs[0], 38, 62, 28);
  ellipse(c, couleurs[0], 90, 62, 28);
  ellipse(c, couleurs[0], 64, 38, 32);
  for (const [x, y] of [
    [40, 54],
    [84, 60],
    [62, 30],
    [70, 66],
  ]) {
    ellipse(c, couleurs[1], x, y, 8);
  }
}

// ---------------------------------------------------------------- Ce que le reste du jeu utilise

const canevas = new Map<string, HTMLCanvasElement>();
const textures = new Map<string, THREE.Texture>();
const adresses = new Map<string, string>();

function obtenir(cle: string, dessiner: (c: C) => void): HTMLCanvasElement {
  let cv = canevas.get(cle);
  if (!cv) {
    cv = toile(dessiner);
    canevas.set(cle, cv);
  }
  return cv;
}

function enTexture(cle: string, dessiner: (c: C) => void): THREE.Texture {
  let texture = textures.get(cle);
  if (!texture) {
    texture = new THREE.CanvasTexture(obtenir(cle, dessiner));
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(cle, texture);
  }
  return texture;
}

function enAdresse(cle: string, dessiner: (c: C) => void): string {
  let adresse = adresses.get(cle);
  if (!adresse) {
    adresse = obtenir(cle, dessiner).toDataURL();
    adresses.set(cle, adresse);
  }
  return adresse;
}

/** Image debout d'une plante dans le champ. */
export function texturePlante(id: CultureId, stade: number): THREE.Texture {
  // Les graines et la petite pousse se ressemblent pour toutes les cultures.
  return enTexture(`plante:${id}:${stade}`, (c) => dessinerPlante(c, DESSINS[id], stade));
}

export function textureDeco(id: DecoId): THREE.Texture {
  return enTexture(`deco:${id}`, DESSINS_DECOS[id]);
}

export function textureArbre(saison: Saison): THREE.Texture {
  return enTexture(`arbre:${saison}`, (c) => dessinerArbre(c, saison));
}

/** Icônes pour les menus (à mettre dans le `src` d'une balise img). */
export function iconeCulture(id: CultureId): string {
  return enAdresse(`produit:${id}`, (c) => dessinerProduit(c, DESSINS[id]));
}

export function iconeRecette(id: RecetteId): string {
  return enAdresse(`recette:${id}`, DESSINS_RECETTES[id]);
}

/** `niveau` change la couleur du métal (1 = fer, 2 = argent, 3 = or). */
export function iconeOutil(outil: OutilDessine, niveau = 1): string {
  return enAdresse(`outil:${outil}:${niveau}`, (c) => dessinerOutil(c, outil, niveau));
}

export function iconeDeco(id: DecoId): string {
  return enAdresse(`deco:${id}`, DESSINS_DECOS[id]);
}
