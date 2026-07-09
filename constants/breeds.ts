export const PIG_BREEDS = [
    'Large White',
    'Landrace',
    'Piétrain',
    'Duroc',
    'Hampshire',
    'Croisé (amélioré)',
    'Local (Gasy)',
    'Autre',
] as const;

export const MADAGASCAR_REGIONS = [
    'Antananarivo',
    'Antsirabe',
    'Tsiroanomandidy',
    'Ambatondrazaka',
    'Analavory',
    'Soavinandriana',
    'Autre région',
] as const;

export const FEED_PHASES = [
    { key: 'starter', label: 'Démarrage (0-4 sem)', defaultPrice: 2200 },
    { key: 'growth', label: 'Croissance (5-12 sem)', defaultPrice: 2000 },
    { key: 'finish', label: 'Finition (13+ sem)', defaultPrice: 1800 },
] as const;
