export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  color: {
    primary: string;
    light: string;
    dark: string;
    border: string;
  };
  image?: string; // SVG import or image path
  features: string[];
  routines: {
    title: string;
    description: string;
    icon: string;
  }[];
  status: 'available' | 'coming-soon';
  badge?: string;
};

export const products: Product[] = [
  {
    id: 'dream',
    name: 'Kidoo Dream',
    tagline: 'Routines intelligentes de coucher et de réveil',
    description:
      'La veilleuse intelligente qui accompagne vos enfants avec des routines automatiques et des effets lumineux apaisants.',
    color: {
      primary: 'purple',
      light: 'purple-100',
      dark: 'purple-900/30',
      border: 'purple-200',
    },
    image: '/assets/dream.svg',
    features: [
      'Horaires personnalisables par jour',
      '5 effets lumineux différents',
      'Couleurs personnalisables',
      'Veilleuse toute la nuit',
      'Contrôle depuis smartphone',
      'Activation automatique',
      'Mode veille programmable',
      'Arrêt automatique configurable',
    ],
    routines: [
      {
        title: 'Routine de coucher',
        description:
          'Choisissez une couleur apaisante ou un effet lumineux doux pour accompagner votre enfant au coucher. La veilleuse peut rester allumée toute la nuit ou s\'éteindre automatiquement.',
        icon: '🌙',
      },
      {
        title: 'Routine de réveil',
        description:
          'Réveillez-vous en douceur avec une lumière progressive qui simule le lever du soleil. Parfait pour commencer la journée du bon pied.',
        icon: '🌅',
      },
    ],
    status: 'available',
    badge: '✨ Populaire',
  },

  // À venir - décommenter et personnaliser selon vos besoins
  // {
  //   id: 'lamp',
  //   name: 'Kidoo Lamp',
  //   tagline: 'Lampe de bureau intelligente',
  //   description:
  //     'Une lampe de bureau avec contrôle de luminosité et température de couleur pour favoriser la concentration et le bien-être.',
  //   color: {
  //     primary: 'amber',
  //     light: 'amber-100',
  //     dark: 'amber-900/30',
  //     border: 'amber-200',
  //   },
  //   features: [
  //     'Contrôle de luminosité 0-100%',
  //     'Température de couleur ajustable',
  //     'Mode lecture',
  //     'Mode détente',
  //     'Minuteur intégré',
  //     'Connexion Bluetooth',
  //   ],
  //   routines: [
  //     {
  //       title: 'Mode Concentration',
  //       description: 'Lumière blanche froide pour favoriser la concentration et les tâches de travail.',
  //       icon: '🎓',
  //     },
  //     {
  //       title: 'Mode Détente',
  //       description: 'Lumière chaude et douce pour se relaxer en fin de journée.',
  //       icon: '🧘',
  //     },
  //   ],
  //   status: 'coming-soon',
  // },
];
