# Soufflez un coup. Roulez mieux. — borne d'écoconduite

Borne tactile pour iPad Air 11" (paysage, 1180 × 820). Quatre scénarios animés,
une question vrai/faux chronométrée par scénario, des explications sourcées
après chaque réponse, et des points.

Aucune dépendance ni étape de build : du HTML, du CSS et du JavaScript.
Seule la police Space Grotesk se charge depuis Google Fonts. Hors ligne, le
navigateur se rabat sur Helvetica Neue.

## Lancer

```bash
python3 -m http.server 8080
```

Ouvrir ensuite `http://localhost:8080/`. On peut aussi ouvrir `index.html`
directement.

- `?scene=3` saute directement au scénario 3 (pour tester ou faire des captures).
- Au clavier : `V` / `F` pour répondre, `Entrée` pour continuer.

## Déroulement

1. **Accueil** : boucle animée (deux voitures à 2 secondes d'écart) et bouton
   « Toucher pour commencer ».
2. **Comment jouer** : trois étapes.
3. **Quatre scénarios**. Chacun suit le même rythme :
   - l'animation se joue et des sous-titres racontent l'action ;
   - elle ralentit au moment clé, puis la question s'affiche (20 s) ;
   - après la réponse ou la fin du temps, l'animation reprend ; l'écran
     d'explication montre la réponse, le chiffre clé, un petit graphique,
     le message de sensibilisation et les sources.
4. **Résultats** : score, rang, record du jour, les 4 réflexes à retenir.

Après 90 s sans toucher l'écran (40 s sur les résultats), la borne revient
à l'accueil.

## Points

| | Points |
|---|---|
| Bonne réponse | 500 |
| Rapidité | jusqu'à 500, au prorata du temps restant |
| Série | +150 par bonne réponse d'affilée après la première |

Maximum : 4 900. Rangs : Pilote zen (≥ 4 000), Conducteur averti (≥ 2 500),
Bon départ (≥ 1 000), En rodage.
Le record du jour reste sur l'appareil (`localStorage`). Rien n'est envoyé.

## Système de design

| Rôle | Couleur |
|---|---|
| Surface principale | Blanc Lin / Craie `#F6F5F0` |
| Structure, texte fort | Bleu Nuit / Ardoise `#16324F` |
| Interaction (éléments tactiles seulement) | Corail / Ambre vif `#E86A33` |
| Validation, progression, récompenses | Vert Sauge `#3D7A5D` |
| Texte principal | Anthracite doux `#1E293B` |

Texte en Helvetica Neue, chiffres en Space Grotesk. Les cibles tactiles
mesurent au moins 64 px, et 96 px pour les boutons Vrai/Faux et le bouton
d'accueil.

## Fichiers

- `index.html` : écrans et icônes.
- `css/kiosk.css` : jetons du système de design et mise en page.
- `js/content.js` : questions, réponses, textes de recherche et sources.
- `js/draw.js` : palette, caméra et primitives de dessin du canvas.
- `js/scenes.js` : les 4 animations et la boucle d'accueil.
- `js/app.js` : déroulement, minuterie, points, retour automatique, sons.

## Installer sur l'iPad

1. Servir le dossier en HTTPS (GitHub Pages, Netlify ou un serveur local).
2. Dans Safari : Partager → « Sur l'écran d'accueil » (plein écran, paysage).
3. Réglages → Accessibilité → **Accès guidé**, puis triple-clic pour
   verrouiller l'iPad sur la borne.

## À vérifier

- Les distances des scénarios 1 et 3 sont calculées sur chaussée sèche, avec
  1,5 s de réaction et un freinage de 7 m/s². Avec ces hypothèses, l'animation
  du scénario 3 affiche **77 km/h** au point où la voiture à 100 s'arrête.
  Le texte après la réponse dit « environ 75 km/h ».
- À comparer avec le module 8 « Vitesse » de la SAAQ avant une présentation.
