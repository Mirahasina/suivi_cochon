export type RaisingPurpose = 'UNDECIDED' | 'FATTENING' | 'BREEDING';

export const RAISING_PURPOSE_LABELS: Record<RaisingPurpose, string> = {
    UNDECIDED: 'Pas encore décidé',
    FATTENING: 'Engraissement (manatavy)',
    BREEDING: 'Reproduction (truie / verrat)',
};
