// Le plein écran, pour ne plus voir la barre du navigateur.
// - Android et ordinateur : le navigateur sait passer en plein écran quand on touche un bouton.
// - iPhone : Safari ne le permet pas. La seule façon est d'ajouter le jeu à l'écran d'accueil ;
//   il s'ouvre alors comme une app, sans barre (c'est le rôle du fichier manifest.webmanifest).

type EcranVerrouillable = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

/** Le jeu a-t-il été lancé depuis l'écran d'accueil ? */
function estInstalle(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function installerPleinEcran(bouton: HTMLButtonElement, message: (texte: string) => void): void {
  if (estInstalle()) return; // déjà en plein écran : pas besoin du bouton
  bouton.hidden = false;

  const racine = document.documentElement;
  const possible = typeof racine.requestFullscreen === 'function' && document.fullscreenEnabled;

  async function entrer(): Promise<void> {
    try {
      await racine.requestFullscreen({ navigationUI: 'hide' });
      // Tant qu'on y est, on bloque l'écran en paysage (Android seulement).
      await (screen.orientation as EcranVerrouillable).lock?.('landscape');
    } catch {
      // Refusé par le navigateur : le jeu reste jouable tel quel.
    }
  }

  bouton.addEventListener('click', () => {
    if (!possible) {
      message("Sur iPhone : bouton Partager, puis « Sur l'écran d'accueil ». Le jeu s'ouvrira en plein écran.");
    } else if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void entrer();
    }
  });

  // Sur téléphone, le premier toucher passe tout seul en plein écran.
  if (possible && window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('pointerup', () => void entrer(), { once: true });
  }
}
