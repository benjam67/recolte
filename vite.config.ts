import { defineConfig } from 'vite';

// base relative : le jeu marche quel que soit le dossier où il est hébergé
// (GitHub Pages, Netlify, puis Capacitor).
export default defineConfig({
  base: './',
});
