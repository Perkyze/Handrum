/* Scenario content: questions, answers, research notes and sources. */
(function () {
  'use strict';
  const Eco = (window.Eco = window.Eco || {});

  Eco.SCENARIOS = [
    {
      short: 'Anticiper',
      title: 'Anticiper la circulation',
      subtitle: 'Piétons et cyclistes',
      question: 'À 50 km/h, pendant ton temps de réaction (avant même de toucher au frein), ta voiture parcourt environ 5 mètres.',
      answer: false,
      explain: 'Elle parcourt environ <b>21 mètres</b>. Face à un imprévu, un conducteur met environ 1,5 seconde à réagir (Green, 2000), et à 50 km/h on fait 13,9 m par seconde.',
      why: 'Anticiper, c’est gagner ces mètres avant qu’il soit trop tard. Un piéton heurté à 37 km/h a environ 10 % de risque de mourir. À 51 km/h, ce risque monte à 25 % (Tefft, AAA Foundation, 2011).',
      fig: '≈ 21 m',
      figCap: 'parcourus à 50 km/h avant même de toucher au frein (1,5 s × 13,9 m/s)',
      mini: {
        type: 'bars',
        caption: 'Risque de décès d’un piéton heurté',
        rows: [
          { label: '37 km/h', value: 10, text: '10 %', tone: 'ok' },
          { label: '51 km/h', value: 25, text: '25 %', tone: 'ink' },
        ],
        max: 25,
      },
      sources: ['Green, 2000 · temps de réaction', 'Tefft, AAA Foundation, 2011'],
      takeaway: 'Regarde loin devant : à 50 km/h, 1,5 s de réaction, c’est déjà 21 m parcourus.',
    },
    {
      short: 'Freiner doux',
      title: 'Accélérer et freiner en douceur',
      subtitle: 'L’effet accordéon',
      question: 'Un bouchon peut se former sans accident, sans travaux ni feu rouge, seulement parce que des conducteurs freinent brusquement.',
      answer: true,
      explain: 'C’est ce qu’a montré l’expérience de Sugiyama et al. (2008) : <b>22 voitures</b> sur une piste circulaire, qui devaient rouler à environ 30 km/h. Des bouchons sont apparus d’eux-mêmes.',
      why: 'Freiner doux, c’est aussi une question de sécurité routière. Une étude terrain (Stern et al., 2018) montre qu’une seule voiture à la conduite régulière suffit à atténuer ces vagues et réduit la consommation de tout le trafic.',
      fig: '22 voitures',
      figCap: 'sur une piste circulaire, sans obstacle : un bouchon est apparu tout seul',
      mini: { type: 'ring', caption: 'Reconstitution : la vague de freinage recule pendant que les voitures avancent.' },
      sources: ['Sugiyama et al., 2008', 'Stern et al., 2018'],
      takeaway: 'Garde tes distances et freine en douceur : tu absorbes les vagues au lieu de les amplifier.',
    },
    {
      short: 'Vitesse',
      title: 'Éviter la vitesse excessive',
      subtitle: 'La distance d’arrêt',
      question: 'La voiture à 120 km/h a besoin d’environ 30 mètres de plus pour s’arrêter que celle à 100 km/h.',
      answer: true,
      explain: 'C’est environ <b>97 m à 100 km/h</b> contre environ <b>129 m à 120 km/h</b>, soit à peu près 32 m de plus. La distance de freinage augmente avec le carré de la vitesse.',
      why: 'Quand la voiture à 100 km/h est déjà arrêtée, celle à 120 km/h roule encore à environ 75 km/h. En plus, à 120 km/h on consomme environ 20 % plus d’essence, pour gagner seulement 2 minutes sur 25 km (RNCan).',
      fig: '+32 m',
      figCap: 'pour s’arrêter à 120 km/h plutôt qu’à 100 km/h (réaction 1,5 s, chaussée sèche)',
      mini: {
        type: 'bars',
        caption: 'Distance d’arrêt totale',
        rows: [
          { label: '100 km/h', value: 97, text: '97 m', tone: 'ok' },
          { label: '120 km/h', value: 129, text: '129 m', tone: 'ink' },
        ],
        max: 129,
        chips: ['≈ +20 % d’essence', '2 min gagnées sur 25 km'],
      },
      sources: ['Calcul : 1,5 s de réaction, 7 m/s²', 'RNCan · conduite écoénergétique', 'SAAQ · lois de la physique'],
      takeaway: '120 au lieu de 100 : 32 m de plus pour t’arrêter et ~20 % d’essence en plus, pour 2 minutes gagnées.',
    },
    {
      short: 'Pneus',
      title: 'Vérifier la pression des pneus',
      subtitle: 'Ce que l’œil ne voit pas',
      question: 'Un pneu qui manque d’air, ça se voit à l’œil.',
      answer: false,
      explain: 'Un pneu peut perdre beaucoup de pression <b>sans paraître dégonflé</b>. Il faut le vérifier au manomètre une fois par mois, pneus froids (NHTSA ; Consumer Reports).',
      why: 'Un pneu sous-gonflé de 56 kPa (8 psi) peut augmenter ta consommation jusqu’à 4 % et réduire sa durée de vie de plus de 10 000 km (RNCan).',
      fig: '8 psi',
      figCap: 'manquants (56 kPa) : invisibles à l’œil, mesurables au manomètre',
      mini: {
        type: 'tiles',
        tiles: [
          { big: '+4 %', small: 'de consommation' },
          { big: '−10 000 km', small: 'de durée de vie' },
          { big: '1×/mois', small: 'au manomètre, pneus froids' },
        ],
      },
      sources: ['RNCan, 2016', 'NHTSA · Tires', 'Consumer Reports'],
      takeaway: 'Vérifie la pression au manomètre une fois par mois, pneus froids.',
    },
  ];

  Eco.RANKS = [
    { min: 4000, title: 'Pilote zen', text: 'Réflexes affûtés et réponses éclair. La route est entre bonnes mains.' },
    { min: 2500, title: 'Conducteur averti', text: 'Tu as l’œil. Encore quelques réflexes et tu passes au niveau zen.' },
    { min: 1000, title: 'Bon départ', text: 'De bonnes bases. Les chiffres de ce quiz surprennent presque tout le monde.' },
    { min: 0, title: 'En rodage', text: 'Ces chiffres surprennent presque tout le monde. Retiens les quatre réflexes ci-contre.' },
  ];
})();
