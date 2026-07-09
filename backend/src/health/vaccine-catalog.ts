export const INJECTION_ROUTES = {
    IM: 'Intramusculaire (IM)',
    IV: 'Intraveineuse (IV)',
    SC: 'Sous-cutanée (SC)',
    ORAL: 'Orale (bouche / lait)',
    IN_FEED: 'Dans l\'aliment',
    IN_WATER: 'Dans l\'eau de boisson',
    INTRADERMAL: 'Intradermique (dans la peau)',
    POUR_ON: 'Pour-on (sur le dos)',
    INTRANASAL: 'Intranasale (nez)',
} as const;

export type InjectionRoute = keyof typeof INJECTION_ROUTES;

export type AnimalTarget = 'PIGLET' | 'SOW' | 'BOAR' | 'GILT' | 'ALL';

export interface VaccineCatalogEntry {
    name: string;
    description: string;
    defaultRecallDays: number | null;
    target: AnimalTarget;
    injectionRoute: InjectionRoute;
    injectionSite: string;
    timingNote: string;
    isMandatory?: boolean;
}

export const VACCINE_CATALOG: VaccineCatalogEntry[] = [
    // ─── PORCELETS ───────────────────────────────────────────
    {
        name: 'Fer (Injection)',
        description: 'Prévention anémie ferriprive — 1ère semaine de vie',
        defaultRecallDays: 0,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou (latéral) ou cuisse',
        timingNote: 'Jour 1 à 3 après naissance',
        isMandatory: true,
    },
    {
        name: 'Fer (Orale)',
        description: 'Alternative au fer injectable pour porcelets',
        defaultRecallDays: 0,
        target: 'PIGLET',
        injectionRoute: 'ORAL',
        injectionSite: 'Gouttes sur la langue ou dans le lait',
        timingNote: 'Jour 1 à 3 après naissance',
        isMandatory: false,
    },
    {
        name: 'Vitamines AD3E',
        description: 'Vitamines A, D3, E — vitalité et croissance',
        defaultRecallDays: 90,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou (derrière l\'oreille)',
        timingNote: 'Semaine 1 (7 jours)',
        isMandatory: false,
    },
    {
        name: 'Vitamine B12',
        description: 'Complément métabolisme et appétit',
        defaultRecallDays: 60,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Semaine 2 (14 jours)',
        isMandatory: false,
    },
    {
        name: 'Colibacillose (E. coli)',
        description: 'Diarrhée néonatale — E. coli K88/K99',
        defaultRecallDays: 0,
        target: 'PIGLET',
        injectionRoute: 'ORAL',
        injectionSite: 'Orale ou IM cou selon produit',
        timingNote: 'Semaine 3 (21 jours) — ou dès J3 selon protocole',
        isMandatory: true,
    },
    {
        name: 'Déparasitage (Interne)',
        description: 'Vers intestinaux (ascaris, strongyles) — ivermectine ou levamisole',
        defaultRecallDays: 120,
        target: 'ALL',
        injectionRoute: 'IN_FEED',
        injectionSite: 'Mélangé dans l\'aliment ou oral direct',
        timingNote: '6 semaines — renouveler tous les 3-4 mois',
        isMandatory: true,
    },
    {
        name: 'Déparasitage (Externe)',
        description: 'Gales, poux, tiques',
        defaultRecallDays: 60,
        target: 'ALL',
        injectionRoute: 'POUR_ON',
        injectionSite: 'Ligne du dos (pour-on) ou spray sur la peau',
        timingNote: '6 semaines — répéter si infestation',
        isMandatory: false,
    },
    {
        name: 'Circovirus (PCV2)',
        description: 'Maladie du dépérissement du porcelet (PMWS)',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '7 semaines (49 jours)',
        isMandatory: true,
    },
    {
        name: 'Mycoplasme (1ère dose)',
        description: 'Pneumonie enzootique — 1ère injection',
        defaultRecallDays: 21,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou (derrière l\'oreille)',
        timingNote: '8 semaines — rappel 3 semaines après',
        isMandatory: true,
    },
    {
        name: 'Mycoplasme (Rappel)',
        description: 'Pneumonie enzootique — rappel',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '11 semaines (21 jours après 1ère dose)',
        isMandatory: true,
    },
    {
        name: 'Rouget + Parvo',
        description: 'Erysipèle (rouget) + Parvovirus porcin',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '9 semaines (63 jours)',
        isMandatory: true,
    },
    {
        name: 'Peste Porcine (Fièvre Porcine)',
        description: 'Vaccin classique fièvre porcine (selon disponibilité locale)',
        defaultRecallDays: 365,
        target: 'ALL',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '6 mois puis rappel annuel',
        isMandatory: true,
    },
    {
        name: 'PRRS (Pneumonie Reproductrice)',
        description: 'Syndrome dysgénésie reproductrice et respiratoire',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '8-10 semaines selon protocole vétérinaire',
        isMandatory: false,
    },
    {
        name: 'Rhinite Atrophique',
        description: 'Rhinite progressive atrophique (Pasteurella)',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '10-12 semaines',
        isMandatory: false,
    },
    {
        name: 'Pastérelloze',
        description: 'Pasteurella multocida — pneumonie',
        defaultRecallDays: 180,
        target: 'PIGLET',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '8 semaines',
        isMandatory: false,
    },

    // ─── TRUIES (avant mise-bas / reproduction) ──────────────
    {
        name: 'Parvovirus Truie (Pré-saillie)',
        description: 'Parvovirus — stérilité, petits momifiés — AVANT saillie',
        defaultRecallDays: 365,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou (derrière l\'oreille)',
        timingNote: '2-4 semaines AVANT la saillie — rappel annuel',
    },
    {
        name: 'Rouget Truie (Pré-saillie)',
        description: 'Erysipèle truie — AVANT saillie ou mise-bas',
        defaultRecallDays: 180,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '2-4 semaines avant saillie — rappel 2-4 sem. avant mise-bas',
    },
    {
        name: 'E. coli Truie (Pré-mise-bas)',
        description: 'Colibacillose — anticorps transmis aux porcelets via lait',
        defaultRecallDays: 0,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou ou cuisse',
        timingNote: '6 semaines AVANT mise-bas (1ère dose)',
    },
    {
        name: 'E. coli Truie (Rappel pré-mise-bas)',
        description: 'Rappel colibacillose truie — 3 semaines avant mise-bas',
        defaultRecallDays: 0,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '3 semaines AVANT la mise-bas (2ème dose)',
    },
    {
        name: 'Vitamines Truie (Pré-mise-bas)',
        description: 'AD3E + B12 truie — force pour la mise-bas et montée de lait',
        defaultRecallDays: 0,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: '1 semaine AVANT la mise-bas',
    },
    {
        name: 'Vermifuge Truie (Pré-mise-bas)',
        description: 'Déparasitage interne truie gestante',
        defaultRecallDays: 0,
        target: 'SOW',
        injectionRoute: 'ORAL',
        injectionSite: 'Orale ou dans l\'aliment',
        timingNote: '2 semaines AVANT la mise-bas',
    },
    {
        name: 'PRRS Truie',
        description: 'PRRS truie gestante — selon protocole vétérinaire',
        defaultRecallDays: 180,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Selon protocole — souvent pré-saillie ou mi-gestation',
    },
    {
        name: 'Leptospirose Truie',
        description: 'Leptospirose — avortements, faible prolificité',
        defaultRecallDays: 365,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Avant saillie — rappel selon protocole',
    },
    {
        name: 'Brucellose Truie',
        description: 'Brucellose (si zone concernée)',
        defaultRecallDays: 365,
        target: 'SOW',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Jeune coche avant 1ère saillie',
    },

    // ─── VERRATS ─────────────────────────────────────────────
    {
        name: 'Rouget Verrat',
        description: 'Erysipèle verrat reproducteur',
        defaultRecallDays: 180,
        target: 'BOAR',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Tous les 6 mois',
    },
    {
        name: 'Parvovirus Verrat',
        description: 'Parvovirus verrat — évite transmission à la truie',
        defaultRecallDays: 365,
        target: 'BOAR',
        injectionRoute: 'IM',
        injectionSite: 'Muscle du cou',
        timingNote: 'Avant mise en reproduction — rappel annuel',
    },
];

// Planning porcelets : jours après naissance
export interface PigletScheduleEntry {
    vaccineName: string;
    ageInDays: number;
    label: string;
}

export const PIGLET_VACCINE_SCHEDULE: PigletScheduleEntry[] = [
    { vaccineName: 'Fer (Injection)', ageInDays: 3, label: 'J3 — Fer IM (anémie)' },
    { vaccineName: 'Vitamines AD3E', ageInDays: 7, label: 'Sem.1 — Vitamines AD3E IM' },
    { vaccineName: 'Vitamine B12', ageInDays: 14, label: 'Sem.2 — Vitamine B12 IM' },
    { vaccineName: 'Colibacillose (E. coli)', ageInDays: 21, label: 'Sem.3 — Colibacillose' },
    { vaccineName: 'Déparasitage (Interne)', ageInDays: 42, label: 'Sem.6 — Vermifuge interne' },
    { vaccineName: 'Déparasitage (Externe)', ageInDays: 42, label: 'Sem.6 — Antiparasitaire externe' },
    { vaccineName: 'Circovirus (PCV2)', ageInDays: 49, label: 'Sem.7 — PCV2 IM cou' },
    { vaccineName: 'Mycoplasme (1ère dose)', ageInDays: 56, label: 'Sem.8 — Mycoplasme dose 1 IM' },
    { vaccineName: 'Rouget + Parvo', ageInDays: 63, label: 'Sem.9 — Rouget+Parvo IM' },
    { vaccineName: 'Mycoplasme (Rappel)', ageInDays: 77, label: 'Sem.11 — Mycoplasme rappel IM' },
    { vaccineName: 'PRRS (Pneumonie Reproductrice)', ageInDays: 70, label: 'Sem.10 — PRRS IM (si utilisé)' },
    { vaccineName: 'Peste Porcine (Fièvre Porcine)', ageInDays: 180, label: '6 mois — Fièvre porcine IM' },
];

// Planning truies : jours AVANT mise-bas (négatif = avant)
export interface SowScheduleEntry {
    vaccineName: string;
    daysBeforeFarrowing: number;
    label: string;
    requiresFarrowingDate?: boolean;
}

export const SOW_VACCINE_SCHEDULE: SowScheduleEntry[] = [
    { vaccineName: 'E. coli Truie (Pré-mise-bas)', daysBeforeFarrowing: 49, label: '7 sem. avant mise-bas — E.coli dose 1 IM', requiresFarrowingDate: true },
    { vaccineName: 'E. coli Truie (Rappel pré-mise-bas)', daysBeforeFarrowing: 21, label: '3 sem. avant mise-bas — E.coli dose 2 IM', requiresFarrowingDate: true },
    { vaccineName: 'Vermifuge Truie (Pré-mise-bas)', daysBeforeFarrowing: 14, label: '2 sem. avant mise-bas — Vermifuge oral', requiresFarrowingDate: true },
    { vaccineName: 'Vitamines Truie (Pré-mise-bas)', daysBeforeFarrowing: 7, label: '1 sem. avant mise-bas — Vitamines AD3E IM', requiresFarrowingDate: true },
    { vaccineName: 'Rouget Truie (Pré-saillie)', daysBeforeFarrowing: -100, label: 'Avant saillie — Rouget IM (2-4 sem. avant)', requiresFarrowingDate: false },
    { vaccineName: 'Parvovirus Truie (Pré-saillie)', daysBeforeFarrowing: -100, label: 'Avant saillie — Parvovirus IM (2-4 sem.)', requiresFarrowingDate: false },
];

export const BIOSECURITY_PPA = {
    title: 'Peste Porcine Africaine (PPA)',
    alert: 'Aucun vaccin commercial efficace contre la PPA. La biosécurité est la seule protection en Madagascar.',
    symptoms: [
        'Fièvre élevée (>40°C)',
        'Perte d\'appétit, léthargie',
        'Vomissements, diarrhée sanglante',
        'Taches rouges/bleues sur la peau (oreilles, ventre)',
        'Morts soudaines en 2-10 jours',
    ],
    prevention: [
        'Quarantaine 21 jours pour tout nouvel animal',
        'Désinfecter véhicules, bottes, matériel',
        'Interdit : restes de cuisine non cuits (swill feeding)',
        'Clôturer la ferme, limiter les visiteurs',
        'Signaler toute mort suspecte au MAEP / vétérinaire',
        'Ne jamais déplacer ni vendre un animal malade',
    ],
};
