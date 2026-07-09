import { projectWeightFromBaseline, isPurchasedAfterBirth, getWeeksBetween } from './weight-projection';

describe('weight-projection', () => {
    it('projects weight from purchase baseline', () => {
        // Acheté à 15 kg quand la norme était 14 kg, norme actuelle 40 kg
        expect(projectWeightFromBaseline(15, 14, 40)).toBe(41);
    });

    it('falls back to norm when no baseline weight', () => {
        expect(projectWeightFromBaseline(0, 14, 40)).toBe(40);
    });

    it('detects purchased pig', () => {
        const birth = new Date('2025-01-01');
        const purchase = new Date('2025-03-15');
        expect(isPurchasedAfterBirth({ birthDate: birth, purchaseDate: purchase })).toBe(true);
        expect(isPurchasedAfterBirth({ birthDate: birth, purchaseDate: birth })).toBe(false);
    });

    it('computes weeks between dates', () => {
        const from = new Date('2025-01-01');
        const to = new Date('2025-03-01');
        expect(getWeeksBetween(from, to)).toBe(8);
    });
});
