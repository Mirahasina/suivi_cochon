import { applyGrowthFactors, getGrowthFactors } from './growth-profile';

describe('growth-profile', () => {
    it('uses same factors for young piglets', () => {
        const pig = { gender: 'MALE', isCastrated: false, raisingPurpose: 'FATTENING' };
        expect(getGrowthFactors(pig, 4)).toEqual({ weightFactor: 1, feedFactor: 1 });
    });

    it('applies male fattening bonus after 8 weeks', () => {
        const pig = { gender: 'MALE', isCastrated: true, raisingPurpose: 'FATTENING' };
        expect(getGrowthFactors(pig, 12).weightFactor).toBeGreaterThan(1);
    });

    it('applies female breeding reduction after 8 weeks', () => {
        const pig = { gender: 'FEMALE', isCastrated: false, raisingPurpose: 'BREEDING' };
        expect(getGrowthFactors(pig, 20).weightFactor).toBeLessThan(1);
    });

    it('adjusts norm values', () => {
        const adjusted = applyGrowthFactors(
            { expectedWeight: 100, recommendedFeed: 2.5 },
            { weightFactor: 1.06, feedFactor: 1.02 },
        );
        expect(adjusted.expectedWeight).toBe(106);
        expect(adjusted.recommendedFeed).toBe(2.55);
    });
});
