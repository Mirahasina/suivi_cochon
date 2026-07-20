import { healthService, pigService } from './api';
import { discoverAlerts, ProposedAlert } from './alertDiscovery';
import { discoverContacts, ProposedContact } from './contactDiscovery';
import { getContactSearchPreferences, getFarmContacts, getWatchAlerts } from './localStore';
import { checkServerReachable } from './syncService';
import type { FarmContact, Pig, VaccineSuggestion, WatchAlert } from './types';

export type AssistantMode = 'offline' | 'online';

export interface AssistantAnswer {
    mode: AssistantMode;
    title: string;
    text: string;
    dataUsed: string[];
    proposedContacts?: ProposedContact[];
    proposedAlerts?: ProposedAlert[];
}

export interface ChatTurn {
    role: 'user' | 'assistant';
    text: string;
}

interface FarmContext {
    pigs: Pig[];
    suggestions: VaccineSuggestion[];
    contacts: FarmContact[];
    alerts: WatchAlert[];
    prefs: Awaited<ReturnType<typeof getContactSearchPreferences>>;
    biosecurity: { title: string; alert: string; symptoms: string[]; prevention: string[] } | null;
}

interface SymptomProfile {
    fever: boolean;
    noAppetite: boolean;
    vomiting: boolean;
    diarrhea: boolean;
    bloodyStool: boolean;
    cough: boolean;
    breathing: boolean;
    lethargy: boolean;
    skinLesions: boolean;
    suddenDeath: boolean;
    weightLoss: boolean;
    isolation: boolean;
}

interface DiseaseHint {
    name: string;
    likelihood: 'élevée' | 'modérée' | 'faible';
    why: string;
    urgency: 'critique' | 'urgent' | 'surveiller';
    actions: string[];
}

const VET_DISCLAIMER =
    "Je ne suis pas vétérinaire : ce sont des pistes probables pour vous aider à réagir vite, pas un diagnostic officiel.";

function normalize(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/** Mots malgaches fréquents → français pour l'analyse locale */
function expandMalagasy(text: string): string {
    const map: [RegExp, string][] = [
        [/\bmarary\b/gi, 'malade'],
        [/\btsy mihinana\b/gi, 'ne mange pas'],
        [/\btsy misotro\b/gi, 'ne boit pas'],
        [/\bkibo\b/gi, 'diarrhee'],
        [/\bfanosotra\b/gi, 'diarrhee'],
        [/\bkitsimotra\b/gi, 'toux'],
        [/\bmaimay\b/gi, 'toux'],
        [/\bhafanana\b/gi, 'fievre'],
        [/\bmaty\b/gi, 'mort'],
        [/\bvaksiny\b/gi, 'vaccin'],
        [/\bmpanampy amin\'ny biby\b/gi, 'veterinaire'],
        [/\balika\b/gi, 'vol'],
        [/\bvery\b/gi, 'vol'],
        [/\bmitady\b/gi, 'cherche'],
        [/\bmaniry\b/gi, 'cherche'],
        [/\bohatra\b/gi, ''],
        [/\bna inona\b/gi, ''],
    ];
    let out = text;
    for (const [re, fr] of map) out = out.replace(re, fr);
    return out;
}

function includesAny(text: string, words: string[]) {
    const q = normalize(text);
    return words.some((w) => q.includes(normalize(w)));
}

function matchPigNames(text: string, pigs: Pig[]) {
    const q = normalize(text);
    return pigs.filter((p) => q.includes(normalize(p.name)));
}

function activePigs(pigs: Pig[]) {
    return pigs.filter((p) => p.status === 'ACTIVE');
}

function extractSymptoms(text: string): SymptomProfile {
    return {
        fever: includesAny(text, ['fievre', 'fièvre', 'temperature', 'température', '40', '41', 'chaud']),
        noAppetite: includesAny(text, ['appetit', 'appétit', 'mange pas', 'ne mange', 'refuse', 'anorexie']),
        vomiting: includesAny(text, ['vomit', 'vomissement', 'vomir']),
        diarrhea: includesAny(text, ['diarrhee', 'diarrhée', 'selles molles', 'selles liquides', 'liquide']),
        bloodyStool: includesAny(text, ['sang', 'sanglant', 'sanglante', 'hemorrag', 'hémorrag']),
        cough: includesAny(text, ['toux', 'tousse', 'tousser']),
        breathing: includesAny(text, ['respir', 'essouffle', 'halète', 'souffle']),
        lethargy: includesAny(text, ['fatigue', 'fatigué', 'létharg', 'couché', 'affaibli', 'faible', 'mou']),
        skinLesions: includesAny(text, ['tache', 'taches', 'peau', 'rouge', 'bleu', 'bleue', 'oreille']),
        suddenDeath: includesAny(text, ['mort subite', 'morts', 'décédé', 'decede', 'est mort']),
        weightLoss: includesAny(text, ['maigri', 'amaigri', 'perte de poids', 'perd du poids']),
        isolation: includesAny(text, ['isolé', 'isole', 'seul', 'écarte', 'ecarte']),
    };
}

function symptomCount(s: SymptomProfile) {
    return Object.values(s).filter(Boolean).length;
}

function diagnoseFromSymptoms(s: SymptomProfile): DiseaseHint[] {
    const hints: DiseaseHint[] = [];

    if (s.fever && (s.skinLesions || s.bloodyStool || s.lethargy) && s.noAppetite) {
        hints.push({
            name: 'Peste porcine africaine (PPA) — suspicion',
            likelihood: 'élevée',
            why: 'Fièvre + perte d\'appétit avec signes cutanés ou digestifs graves.',
            urgency: 'critique',
            actions: [
                'Isolez immédiatement l\'animal et stoppez tout mouvement vers l\'extérieur.',
                'Appelez un vétérinaire ou le MAEP sans attendre.',
                'Désinfectez bottes, outils et accès à l\'enclos.',
            ],
        });
    }

    if (s.diarrhea && s.vomiting && s.noAppetite) {
        hints.push({
            name: 'Trouble digestif aigu (colibacillose, intoxication alimentaire)',
            likelihood: s.bloodyStool ? 'élevée' : 'modérée',
            why: 'Association diarrhée / vomissements avec baisse d\'appétit.',
            urgency: s.bloodyStool ? 'urgent' : 'surveiller',
            actions: [
                'Coupez les restes de cuisine et vérifiez l\'eau (propre, à l\'ombre).',
                'Isolez l\'animal et notez l\'heure d\'apparition des symptômes.',
                'Si ça empire en 24 h ou si le cochon ne boit plus : vétérinaire.',
            ],
        });
    }

    if (s.cough || s.breathing) {
        hints.push({
            name: 'Problème respiratoire (mycoplasme, PRRS, poussière)',
            likelihood: 'modérée',
            why: 'Toux ou respiration difficile signalée.',
            urgency: 'surveiller',
            actions: [
                'Aérez sans courant d\'air direct sur les porcs.',
                'Réduisez la poussière de litière et vérifiez la densité dans l\'enclos.',
                'Si plusieurs animaux toussent : isolez les cas et consultez.',
            ],
        });
    }

    if (s.noAppetite && s.lethargy && !s.fever && !s.diarrhea) {
        hints.push({
            name: 'Fièvre ou stress (chaleur, parasitisme, douleur)',
            likelihood: 'modérée',
            why: 'Animal apathique avec appétit réduit, sans signe digestif net.',
            urgency: 'surveiller',
            actions: [
                'Mesurez la température si possible (normal ~38,5–39,5 °C).',
                'Vérifiez ombre, eau fraîche et parasites externes.',
                'Surveillez 24–48 h ; si pas d\'amélioration, appelez le vétérinaire.',
            ],
        });
    }

    if (s.weightLoss && !s.suddenDeath) {
        hints.push({
            name: 'Parasitisme ou sous-alimentation',
            likelihood: 'faible',
            why: 'Perte de poids progressive mentionnée.',
            urgency: 'surveiller',
            actions: [
                'Comparez la ration aux autres cochons du même âge.',
                'Envisagez un vermifuge seulement sur avis vétérinaire.',
            ],
        });
    }

    if (hints.length === 0 && symptomCount(s) > 0) {
        hints.push({
            name: 'Cause encore imprécise',
            likelihood: 'faible',
            why: 'Les signes ne correspondent pas clairement à un profil connu.',
            urgency: 'surveiller',
            actions: [
                'Isolez par précaution et notez température, appétit et selles toutes les 6 h.',
                'Décrivez-moi plus de détails (âge, depuis quand, autres cochons touchés).',
            ],
        });
    }

    return hints;
}

function pigSummary(pig: Pig): string {
    const w = pig.currentStatus?.currentWeight;
    const parts = [
        `${pig.name} (${pig.ageFormatted || `${pig.ageInWeeks} sem.`}, ${pig.gender === 'MALE' ? 'mâle' : 'femelle'})`,
        w != null ? `${w} kg` : 'poids non renseigné',
    ];
    if (pig.isQuarantined) parts.push('en quarantaine');
    if (pig.currentStatus?.isUnderweight) parts.push('sous le poids attendu');
    return parts.join(' — ');
}

function formatHints(hints: DiseaseHint[]): string {
    return hints
        .map((h, i) => {
            const urgencyLabel =
                h.urgency === 'critique' ? 'Critique' : h.urgency === 'urgent' ? 'Urgent' : 'À surveiller';
            return (
                `${i + 1}. **${h.name}** (${h.likelihood}, ${urgencyLabel})\n` +
                `   ${h.why}\n` +
                `   → ${h.actions.join('\n   → ')}`
            );
        })
        .join('\n\n');
}

function buildGreeting(mode: AssistantMode, pigCount: number): AssistantAnswer {
    const intro =
        pigCount > 0
            ? `Bonjour ! Je vois ${pigCount} cochon${pigCount > 1 ? 's' : ''} actif${pigCount > 1 ? 's' : ''} dans votre élevage.`
            : 'Bonjour ! Votre élevage est encore vide dans l\'app — ajoutez vos cochons pour des réponses plus précises.';
    return {
        mode,
        title: 'Assistant élevage',
        text:
            `${intro}\n\n` +
            'Parlez en français ou en malgache simple (ex: « marary », « tsy mihinana », « mitady dokotera »).\n\n' +
            'Posez une question naturelle : poids, vaccins, santé, alertes, contacts…\n\n' +
            VET_DISCLAIMER,
        dataUsed: ['élevage local'],
    };
}

function answerWeight(question: string, ctx: FarmContext, mode: AssistantMode): AssistantAnswer {
    const selected = matchPigNames(question, ctx.pigs);
    const targets = selected.length > 0 ? selected : activePigs(ctx.pigs);

    if (targets.length === 0) {
        return {
            mode,
            title: 'Poids',
            text: 'Je n\'ai trouvé aucun cochon actif. Ajoutez-les dans l\'onglet Accueil, puis redemandez-moi leurs poids.',
            dataUsed: ['liste cochons'],
        };
    }

    const lines = targets.map((p) => {
        const w = p.currentStatus?.currentWeight;
        const expected = p.currentStatus?.expectedWeight;
        let line = `• ${pigSummary(p)}`;
        if (w != null && expected != null && w < expected * 0.9) {
            line += `\n  Il est un peu en dessous de la norme attendue (~${Math.round(expected)} kg).`;
        }
        return line;
    });

    const intro =
        selected.length > 0
            ? `Voici ce que j'ai pour ${selected.map((p) => p.name).join(' et ')} :`
            : `Voici le point poids de votre troupeau (${targets.length} cochon${targets.length > 1 ? 's' : ''}) :`;

    return {
        mode,
        title: 'Poids',
        text: `${intro}\n\n${lines.join('\n')}`,
        dataUsed: ['poids actuel', 'courbe de croissance'],
    };
}

function answerVaccines(ctx: FarmContext, mode: AssistantMode): AssistantAnswer {
    const due = ctx.suggestions.filter((s) => s.status === 'due' || s.status === 'overdue');
    const overdue = due.filter((s) => s.status === 'overdue');

    if (due.length === 0) {
        return {
            mode,
            title: 'Vaccins',
            text:
                'Bonne nouvelle : d\'après vos données locales, aucun vaccin urgent ne ressort pour le moment.\n\n' +
                'Je vous conseille quand même de vérifier l\'onglet Santé pour le planning complet.',
            dataUsed: ['suggestions vaccinales'],
        };
    }

    const lines = due.slice(0, 8).map((d) => {
        const status = d.status === 'overdue' ? 'en retard' : 'à faire bientôt';
        return `• ${d.pigName} : ${d.vaccineName} (${status})`;
    });

    const intro =
        overdue.length > 0
            ? `Attention, ${overdue.length} rappel${overdue.length > 1 ? 's' : ''} en retard. Voici les priorités :`
            : 'Voici les vaccins à prévoir en priorité :';

    return {
        mode,
        title: 'Vaccins',
        text: `${intro}\n\n${lines.join('\n')}\n\nPlanifiez-les dès que possible pour limiter les risques.`,
        dataUsed: ['suggestions vaccinales'],
    };
}

async function answerSick(question: string, ctx: FarmContext, mode: AssistantMode): Promise<AssistantAnswer> {
    const symptoms = extractSymptoms(question);
    const named = matchPigNames(question, ctx.pigs);
    const pig = named[0];
    const hasSymptoms = symptomCount(symptoms) > 0;

    const relatedAlerts = await discoverAlerts('DISEASE', ctx.prefs, ctx.alerts, mode === 'online');

    if (!hasSymptoms) {
        const pigPart = pig ? `Pour ${pig.name} (${pig.ageFormatted}), ` : '';
        let text =
            `${pigPart}je comprends votre inquiétude.\n\n` +
            'Décrivez-moi ce que vous observez (appétit, fièvre, toux, selles…). Plus c\'est précis, mieux je peux vous orienter.\n\n' +
            'En attendant : isolez l\'animal, eau propre, notez l\'heure des symptômes.\n\n' +
            VET_DISCLAIMER;
        if (relatedAlerts.length > 0) {
            text += `\n\nJ'ai aussi trouvé ${relatedAlerts.length} alerte${relatedAlerts.length > 1 ? 's' : ''} maladie — voir ci-dessous.`;
        }
        return {
            mode,
            title: 'Santé',
            text,
            dataUsed: pig ? ['fiche cochon'] : [],
            proposedAlerts: relatedAlerts.length > 0 ? relatedAlerts : undefined,
        };
    }

    const hints = diagnoseFromSymptoms(symptoms);
    const pigLine = pig ? `\n\nCochon concerné : ${pigSummary(pig)}.` : '';
    const quarantineNote =
        pig?.isQuarantined ? '\nIl est déjà en quarantaine — continuez l\'isolement.' : '\nMettez-le en quarantaine si ce n\'est pas fait.';

    let text =
        `D'après ce que vous décrivez, voici les pistes les plus probables :${pigLine}${quarantineNote}\n\n` +
        formatHints(hints).replace(/\*\*/g, '');

    if (relatedAlerts.length > 0) {
        text += `\n\n${relatedAlerts.length} alerte${relatedAlerts.length > 1 ? 's' : ''} maladie autour de vous — vérifiez ci-dessous.`;
    }

    if (mode === 'online' && ctx.biosecurity?.prevention.length) {
        text += `\n\nRappel PPA : ${ctx.biosecurity.prevention[0]}`;
    }

    text += `\n\n${VET_DISCLAIMER}`;

    return {
        mode,
        title: 'Analyse santé',
        text,
        dataUsed: [
            ...(hasSymptoms ? ['symptômes'] : []),
            ...(pig ? ['fiche cochon'] : []),
            ...(relatedAlerts.length > 0 ? ['alertes', 'recherche automatique'] : []),
        ],
        proposedAlerts: relatedAlerts.length > 0 ? relatedAlerts : undefined,
    };
}

async function answerAlertWatch(
    ctx: FarmContext,
    mode: AssistantMode,
    focus: 'ALL' | 'DISEASE' | 'THEFT',
    adviceText: string,
): Promise<AssistantAnswer> {
    const proposals = await discoverAlerts(focus, ctx.prefs, ctx.alerts, mode === 'online');
    const webCount = proposals.filter((a) => a.source === 'web').length;
    const localCount = proposals.filter((a) => a.source === 'local').length;

    let text = adviceText;
    if (proposals.length === 0) {
        text +=
            mode === 'online'
                ? '\n\nAucune alerte trouvée pour le moment dans vos zones.'
                : '\n\nHors ligne : pas d\'alerte locale. Reconnectez-vous pour la veille automatique.';
    } else {
        text += `\n\nJ'ai trouvé ${proposals.length} alerte${proposals.length > 1 ? 's' : ''}`;
        if (localCount > 0 || webCount > 0) {
            const parts: string[] = [];
            if (localCount > 0) parts.push(`${localCount} locale${localCount > 1 ? 's' : ''}`);
            if (webCount > 0) parts.push(`${webCount} actu${webCount > 1 ? 's' : ''}`);
            text += ` (${parts.join(', ')})`;
        }
        text += ' — voir ci-dessous.';
    }

    text += `\n\n${VET_DISCLAIMER}`;

    return {
        mode,
        title: focus === 'THEFT' ? 'Vol' : focus === 'DISEASE' ? 'Biosécurité' : 'Veille',
        text,
        dataUsed: ['alertes', 'recherche automatique'],
        proposedAlerts: proposals.length > 0 ? proposals : undefined,
    };
}

async function answerSpread(ctx: FarmContext, mode: AssistantMode): Promise<AssistantAnswer> {
    const prevention = ctx.biosecurity?.prevention ?? [
        'Quarantaine 21 jours pour tout nouvel animal',
        'Désinfecter véhicules, bottes, matériel',
        'Clôturer la ferme, limiter les visiteurs',
        'Signaler toute mort suspecte au vétérinaire',
    ];
    return answerAlertWatch(
        ctx,
        mode,
        'DISEASE',
        'Si une maladie circule autour de vous :\n\n' + prevention.map((p) => `• ${p}`).join('\n'),
    );
}

async function answerTheft(ctx: FarmContext, mode: AssistantMode): Promise<AssistantAnswer> {
    return answerAlertWatch(
        ctx,
        mode,
        'THEFT',
        'Pour un risque de vol :\n\n' +
            '• Renforcez clôtures et éclairage\n' +
            '• Évitez les animaux en bordure de route\n' +
            '• Notez heure, nombre, direction\n' +
            '• Prévenez voisins et groupements locaux',
    );
}

function answerFeedShortage(ctx: FarmContext, mode: AssistantMode, proposals: ProposedContact[]): AssistantAnswer {
    let text =
        'Rupture d\'aliment — voici ce que je vous conseille :\n\n' +
        '• Vérifiez vos stocks réels et réduisez le gaspillage\n' +
        '• Priorisez truies allaitantes et porcelets\n' +
        '• Envisagez une provende locale temporaire (transition progressive)';

    if (proposals.length > 0) {
        text += `\n\nJ'ai trouvé ${proposals.length} fournisseur${proposals.length > 1 ? 's' : ''} — enregistrez ou contactez directement ci-dessous.`;
    } else if (mode === 'offline') {
        text += '\n\nHors ligne : aucun fournisseur trouvé localement. Reconnectez-vous pour lancer une recherche automatique.';
    } else {
        text += '\n\nJe n\'ai pas trouvé de fournisseur dans vos zones. Essayez d\'élargir les zones dans Urgence.';
    }

    return {
        mode,
        title: 'Alimentation',
        text,
        dataUsed: ['contacts alimentation', 'recherche automatique'],
        proposedContacts: proposals.length > 0 ? proposals : undefined,
    };
}

async function answerContactSearch(
    ctx: FarmContext,
    mode: AssistantMode,
    kind: 'VET' | 'FEED_SUPPLIER',
): Promise<AssistantAnswer> {
    const proposals = await discoverContacts(kind, ctx.prefs, ctx.contacts, mode === 'online');
    const label = kind === 'VET' ? 'vétérinaires' : 'fournisseurs d\'alimentation';
    const zones = ctx.prefs.allowedZones.filter(Boolean).join(', ') || ctx.prefs.farmBaseLocation || 'votre zone';

    if (proposals.length === 0) {
        return {
            mode,
            title: kind === 'VET' ? 'Vétérinaires' : 'Alimentation',
            text:
                `Je n'ai trouvé aucun ${kind === 'VET' ? 'vétérinaire' : 'fournisseur'} pour ${zones}.\n\n` +
                (mode === 'offline'
                    ? 'Reconnectez-vous pour que je lance une recherche en ligne automatiquement.'
                    : 'Élargissez les zones de recherche dans l\'onglet Urgence, ou ajoutez un contact manuellement.'),
            dataUsed: ['recherche automatique', 'zones autorisées'],
        };
    }

    const discovered = proposals.filter((p) => !p.alreadySaved).length;
    const intro =
        mode === 'online' && discovered > 0
            ? `J'ai cherché automatiquement autour de ${zones}. Voici ${proposals.length} contact${proposals.length > 1 ? 's' : ''} :`
            : `Voici ${proposals.length} contact${proposals.length > 1 ? 's' : ''} enregistré${proposals.length > 1 ? 's' : ''} :`;

    return {
        mode,
        title: kind === 'VET' ? 'Vétérinaires' : 'Alimentation',
        text: `${intro}\n\nEnregistrez ceux qui vous conviennent ou contactez-les directement.`,
        dataUsed: ['carnet local', 'recherche automatique'],
        proposedContacts: proposals,
    };
}

function answerHerdOverview(ctx: FarmContext, mode: AssistantMode): AssistantAnswer {
    const pigs = activePigs(ctx.pigs);
    const underweight = pigs.filter((p) => p.currentStatus?.isUnderweight);
    const quarantined = pigs.filter((p) => p.isQuarantined);
    const dueVaccines = ctx.suggestions.filter((s) => s.status === 'due' || s.status === 'overdue').length;

    const lines = [
        `• ${pigs.length} cochon${pigs.length > 1 ? 's' : ''} actif${pigs.length > 1 ? 's' : ''}`,
        dueVaccines > 0 ? `• ${dueVaccines} vaccin${dueVaccines > 1 ? 's' : ''} à prévoir` : '• Vaccins : rien d\'urgent',
        underweight.length > 0 ? `• ${underweight.length} en dessous du poids attendu` : null,
        quarantined.length > 0 ? `• ${quarantined.length} en quarantaine` : null,
        ctx.alerts.filter((a) => a.status === 'OPEN').length > 0
            ? `• ${ctx.alerts.filter((a) => a.status === 'OPEN').length} alerte${ctx.alerts.filter((a) => a.status === 'OPEN').length > 1 ? 's' : ''} ouverte${ctx.alerts.filter((a) => a.status === 'OPEN').length > 1 ? 's' : ''}`
            : null,
    ].filter(Boolean);

    return {
        mode,
        title: 'Vue troupeau',
        text: `Voici un résumé rapide de votre élevage :\n\n${lines.join('\n')}\n\nDemandez-moi un détail (poids, vaccins, un cochon précis…).`,
        dataUsed: ['troupeau', 'vaccins', 'alertes'],
    };
}

type IntentFlags = {
    isGreeting: boolean;
    isWeight: boolean;
    isSick: boolean;
    isVet: boolean;
    isFeed: boolean;
    isSpread: boolean;
    isTheft: boolean;
    isAlerts: boolean;
    isVaccine: boolean;
    isOverview: boolean;
};

function detectIntent(q: string): IntentFlags {
    const isGreeting = includesAny(q, ['bonjour', 'salut', 'bonsoir', 'aide', 'hello']);
    const isWeight = includesAny(q, ['poids', 'kg', 'peser', 'pese', 'combien pese', 'combien pèse']);
    const isSick =
        includesAny(q, ['malade', 'maladie', 'symptom', 'symptôme', 'fievre', 'fièvre', 'toux', 'diarrhee', 'diarrhée', 'vomit']) ||
        extractSymptoms(q).noAppetite;
    const isVet =
        includesAny(q, ['vet', 'veterinaire', 'vétérinaire', 'docteur']) ||
        (includesAny(q, ['cherche', 'recherche', 'trouve', 'besoin']) && includesAny(q, ['vet', 'veterinaire', 'vétérinaire']));
    const isFeed =
        includesAny(q, ['aliment', 'provende', 'nourriture', 'rupture', 'fournisseur', 'provendeur']) ||
        (includesAny(q, ['cherche', 'recherche', 'trouve', 'besoin']) &&
            includesAny(q, ['aliment', 'provende', 'nourriture', 'fournisseur']));
    const isSpread = includesAny(q, ['repand', 'répand', 'epidem', 'épidém', 'contag', 'autour', 'voisin', 'se propage']);
    const isTheft = includesAny(q, ['vol', 'vole', 'voleur', 'cambriol']);
    const isAlerts = includesAny(q, ['alerte', 'actus', 'actualite', 'nouvelle', 'quoi de neuf', 'veille', 'danger']);
    const isVaccine = includesAny(q, ['vaccin', 'rappel', 'injection']);
    const isOverview = includesAny(q, ['resume', 'résumé', 'etat', 'état', 'troupeau', 'elevage', 'élevage', 'situation']);

    return { isGreeting, isWeight, isSick, isVet, isFeed, isSpread, isTheft, isAlerts, isVaccine, isOverview };
}

function hasStrongIntent(intent: IntentFlags) {
    return (
        intent.isWeight ||
        intent.isSick ||
        intent.isVet ||
        intent.isFeed ||
        intent.isSpread ||
        intent.isTheft ||
        intent.isAlerts ||
        intent.isVaccine ||
        intent.isOverview
    );
}

/** Suites courtes (« et après ? », « oui », symptômes seuls) → on enrichit avec le dernier message user. */
function mergeContextText(question: string, history: ChatTurn[]): string {
    const currentIntent = detectIntent(normalize(question));
    if (hasStrongIntent(currentIntent)) return question;

    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    if (!lastUser || normalize(lastUser.text) === normalize(question)) return question;

    const words = question.trim().split(/\s+/).filter(Boolean);
    const looksLikeFollowUp = words.length <= 12 || includesAny(question, [
        'et', 'aussi', 'ensuite', 'apres', 'après', 'oui', 'non', 'pourquoi', 'comment', 'plus', 'encore',
    ]);
    if (!looksLikeFollowUp) return question;

    return `${lastUser.text}\n${question}`;
}

export async function askHybridAssistant(question: string, history: ChatTurn[] = []): Promise<AssistantAnswer> {
    const online = await checkServerReachable();
    const mode: AssistantMode = online ? 'online' : 'offline';
    const expandedQuestion = expandMalagasy(question);
    const expandedHistory = history.map((h) => ({ ...h, text: expandMalagasy(h.text) }));
    const currentIntent = detectIntent(normalize(expandedQuestion));
    const fullText = mergeContextText(expandedQuestion, expandedHistory);
    // Si le message actuel est vague, on reprend l'intention du contexte fusionné
    const intent = hasStrongIntent(currentIntent)
        ? currentIntent
        : detectIntent(normalize(fullText));
    const q = normalize(fullText);

    const [pigs, suggestions, contacts, alerts, prefs, biosecurity] = await Promise.all([
        pigService.getAll().catch(() => [] as Pig[]),
        healthService.getSuggested().catch(() => [] as VaccineSuggestion[]),
        getFarmContacts().catch(() => [] as FarmContact[]),
        getWatchAlerts().catch(() => [] as WatchAlert[]),
        getContactSearchPreferences(),
        healthService.getBiosecurity().catch(() => null),
    ]);

    const ctx: FarmContext = { pigs, suggestions, contacts, alerts, prefs, biosecurity };
    const active = activePigs(pigs);

    if (currentIntent.isGreeting && !hasStrongIntent(currentIntent) && history.length === 0) {
        return buildGreeting(mode, active.length);
    }

    if (intent.isWeight || (intent.isOverview && includesAny(q, ['poids']))) {
        return answerWeight(fullText, ctx, mode);
    }

    if (intent.isVaccine) {
        return answerVaccines(ctx, mode);
    }

    if (intent.isVet) {
        return answerContactSearch(ctx, mode, 'VET');
    }

    if (intent.isFeed) {
        if (includesAny(q, ['rupture', 'manque', 'plus de'])) {
            const proposals = await discoverContacts('FEED_SUPPLIER', ctx.prefs, ctx.contacts, mode === 'online');
            return answerFeedShortage(ctx, mode, proposals);
        }
        return answerContactSearch(ctx, mode, 'FEED_SUPPLIER');
    }

    if (intent.isSick || extractSymptoms(fullText).noAppetite) {
        return answerSick(fullText, ctx, mode);
    }

    if (intent.isSpread) {
        return answerSpread(ctx, mode);
    }

    if (intent.isTheft) {
        return answerTheft(ctx, mode);
    }

    if (intent.isAlerts) {
        return answerAlertWatch(ctx, mode, 'ALL', 'Veille automatique autour de votre ferme :');
    }

    if (intent.isOverview) {
        return answerHerdOverview(ctx, mode);
    }

    const named = matchPigNames(fullText, pigs);
    if (named.length > 0) {
        const pig = named[0];
        return {
            mode,
            title: pig.name,
            text:
                `Voici ce que je sais sur ${pig.name} :\n\n` +
                `• ${pigSummary(pig)}\n` +
                `• Race : ${pig.breed}\n` +
                `• Statut : ${pig.status === 'ACTIVE' ? 'actif' : pig.status}\n` +
                (pig.raisingPurpose && pig.raisingPurpose !== 'UNDECIDED'
                    ? `• Destination : ${pig.currentStatus?.raisingPurposeLabel || pig.raisingPurpose}\n`
                    : '') +
                '\nQue voulez-vous savoir sur lui ? Poids, santé, vaccins…',
            dataUsed: ['fiche cochon'],
        };
    }

    return {
        mode,
        title: 'Je peux vous aider',
        text:
            'Je n\'ai pas bien compris, mais voici ce que je sais faire :\n\n' +
            '• « Quel poids fait Manolo ? » — poids et croissance\n' +
            '• « Mon cochon vomit et ne mange plus » — pistes santé\n' +
            '• « Vaccins en retard » — planning urgent\n' +
            '• « Maladie autour de moi » — alertes + biosécurité\n' +
            '• « Cherche un vétérinaire » — contacts automatiques\n' +
            '• « Y a-t-il des alertes ? » — veille locale et web\n\n' +
            'Reformulez en une phrase naturelle, comme si vous parliez à un collègue éleveur.\n\n' +
            VET_DISCLAIMER,
        dataUsed: ['élevage local'],
    };
}
