import { healthService, pigService } from './api';
import { getContactSearchPreferences, getFarmContacts } from './localStore';
import { checkServerReachable } from './syncService';
import type { FarmContact, Pig, VaccineSuggestion } from './types';

export type AssistantMode = 'offline' | 'online';

export interface AssistantAnswer {
    mode: AssistantMode;
    title: string;
    text: string;
    dataUsed: string[];
}

function normalize(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function matchPigNames(question: string, pigs: Pig[]) {
    const q = normalize(question);
    return pigs.filter((p) => q.includes(normalize(p.name)));
}

function buildWeightAnswer(selected: Pig[], mode: AssistantMode): AssistantAnswer {
    const rows = selected.map((p) => {
        const w = p.currentStatus?.currentWeight;
        return `${p.name}: ${w != null ? `${w} kg` : 'poids indisponible'}`;
    });
    return {
        mode,
        title: 'Poids des cochons demandés',
        text: rows.join('\n'),
        dataUsed: ['poids actuel', 'liste cochons'],
    };
}

function buildSickHelp(mode: AssistantMode): AssistantAnswer {
    return {
        mode,
        title: 'Triage santé (probable, non vétérinaire)',
        text:
            "Donnez-moi ces infos pour estimer les causes probables:\n" +
            '- Nom du cochon\n' +
            '- Température\n' +
            '- Appétit (normal/faible/arrêt)\n' +
            '- Respiration (toux, rapide, normale)\n' +
            '- Selles (normales/diarrhée/sang)\n' +
            '- État général (fatigue, isolement)\n' +
            '- Alimentation et eau\n' +
            '- Environnement (froid/chaleur/humidité)\n' +
            "Je donnerai ensuite un niveau de risque et des précautions.",
        dataUsed: ['données cochons', 'symptômes saisis'],
    };
}

function buildSpreadHelp(mode: AssistantMode): AssistantAnswer {
    return {
        mode,
        title: 'Précautions maladie qui se propage',
        text:
            '- Isoler les cochons symptomatiques\n' +
            '- Désinfection quotidienne (sol, bottes, matériel)\n' +
            '- Limiter visites et échanges entre enclos\n' +
            '- Eau propre et alimentation non contaminée\n' +
            '- Noter les symptômes et températures par cochon\n' +
            '- Si mortalité rapide ou fièvre élevée: vétérinaire urgent',
        dataUsed: ['protocole biosécurité'],
    };
}

function zoneAllowed(location: string | undefined, allowedZones: string[], blockedZones: string[]) {
    if (!location) return true;
    const loc = normalize(location);
    const blocked = blockedZones.some((z) => loc.includes(normalize(z)));
    if (blocked) return false;
    if (allowedZones.length === 0) return true;
    return allowedZones.some((z) => loc.includes(normalize(z)));
}

function buildContactAnswer(
    mode: AssistantMode,
    contacts: FarmContact[],
    kind: 'VET' | 'FEED_SUPPLIER',
    allowedZones: string[],
    blockedZones: string[],
): AssistantAnswer {
    const filtered = contacts.filter((c) => c.type === kind && zoneAllowed(c.location, allowedZones, blockedZones));
    const label = kind === 'VET' ? 'vétérinaires' : "distributeurs d'alimentation";
    if (filtered.length === 0) {
        return {
            mode,
            title: `Aucun ${label} enregistré`,
            text:
                `Aucun ${label} trouvé dans les zones utiles.\n` +
                'Ajoutez-les dans le carnet local ou faites une recherche web ciblée.',
            dataUsed: ['carnet local', 'zones autorisées'],
        };
    }
    return {
        mode,
        title: `Contacts ${label}`,
        text: filtered
            .slice(0, 8)
            .map((c) => `- ${c.name}${c.phone ? ` | ${c.phone}` : ''}${c.location ? ` | ${c.location}` : ''}`)
            .join('\n'),
        dataUsed: ['carnet local contacts', 'filtre zones'],
    };
}

export async function askHybridAssistant(question: string): Promise<AssistantAnswer> {
    const online = await checkServerReachable();
    const mode: AssistantMode = online ? 'online' : 'offline';
    const q = normalize(question);

    const pigs = await pigService.getAll().catch(() => [] as Pig[]);
    const suggestions = await healthService.getSuggested().catch(() => [] as VaccineSuggestion[]);
    const contacts = await getFarmContacts().catch(() => [] as FarmContact[]);
    const prefs = await getContactSearchPreferences();

    if (q.includes('poids') || q.includes('kg')) {
        const selected = matchPigNames(question, pigs);
        if (selected.length > 0) return buildWeightAnswer(selected, mode);
    }

    if (q.includes('malad')) {
        return buildSickHelp(mode);
    }

    if (q.includes('vet') || q.includes('veterinaire')) {
        return buildContactAnswer(mode, contacts, 'VET', prefs.allowedZones, prefs.blockedFarZones);
    }

    if (q.includes('aliment') || q.includes('provende') || q.includes('rupture')) {
        return buildContactAnswer(mode, contacts, 'FEED_SUPPLIER', prefs.allowedZones, prefs.blockedFarZones);
    }

    if (q.includes('repand') || q.includes('epidem') || q.includes('contag')) {
        return buildSpreadHelp(mode);
    }

    if (q.includes('vaccin') || q.includes('rappel')) {
        const due = suggestions.filter((s) => s.status === 'due' || s.status === 'overdue').slice(0, 8);
        const lines =
            due.length > 0
                ? due.map((d) => `- ${d.pigName}: ${d.vaccineName} (${d.status === 'overdue' ? 'en retard' : 'à faire'})`)
                : ['Aucun vaccin urgent trouvé dans les données locales.'];
        return {
            mode,
            title: 'Vaccins prioritaires',
            text: lines.join('\n'),
            dataUsed: ['suggestions vaccinales'],
        };
    }

    return {
        mode,
        title: 'Aide IA hybride',
        text:
            "Je peux vous aider sur:\n" +
            '- Poids des cochons (ex: poids de Manolo et Mia)\n' +
            '- Vaccins en retard\n' +
            '- Triage de symptômes\n' +
            '- Précautions biosécurité\n' +
            '- Contacts vétérinaires / fournisseurs',
        dataUsed: ['données locales de la ferme'],
    };
}

