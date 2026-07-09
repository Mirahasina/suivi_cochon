export interface VaccineType {
    id: number;
    name: string;
    description?: string;
    defaultRecallDays: number;
    target: 'PIGLET' | 'SOW' | 'BOAR' | 'GILT' | 'ALL';
    injectionRoute: string;
    injectionSite?: string;
    timingNote?: string;
    isMandatory?: boolean;
    isEnabled?: boolean;
    isCustom?: boolean;
}

export interface VaccineSuggestion {
    pigId: number;
    pigName: string;
    vaccineTypeId: number;
    vaccineName: string;
    label: string;
    injectionRoute?: string;
    injectionRouteLabel?: string;
    injectionSite?: string;
    timingNote?: string;
    target?: string;
    dueAtDays: number;
    ageInDays: number;
    status: 'overdue' | 'due' | 'upcoming';
    scheduledDate: string;
}

export interface Vaccination {
    id: number;
    date: string;
    nextDueDate?: string;
    notes?: string;
    vaccineType: { id: number; name: string; description?: string };
}

export interface Pig {
    id: number;
    name: string;
    breed: string;
    gender: 'MALE' | 'FEMALE';
    birthDate: string;
    purchaseDate?: string;
    purchasePrice?: number;
    initialWeight?: number;
    isCastrated: boolean;
    castrationDate?: string;
    raisingPurpose?: 'UNDECIDED' | 'FATTENING' | 'BREEDING';
    raisingPurposeDate?: string;
    matingDate?: string;
    partnerId?: number;
    partnerName?: string;
    motherId?: number;
    farrowingDate?: string;
    nursingPiglets: number;
    status: 'ACTIVE' | 'SOLD' | 'DECEASED';
    ageFormatted: string;
    ageInWeeks: number;
    weeksOnFarm?: number | null;
    purchaseWeight?: number | null;
    isPurchasedAfterBirth?: boolean;
    salePrice?: number;
    saleDate?: string;
    saleType?: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT';
    saleWeightKg?: number;
    salePricePerKg?: number;
    isQuarantined?: boolean;
    quarantineReason?: string;
    vaccinations?: Vaccination[];
    weightChart?: { date: string; weight: number; isManual?: boolean }[];
    normCurve?: { week: number; expectedWeight: number }[];
    batch?: { id: number; name: string };
    _pendingSync?: boolean;
    currentStatus: {
        expectedWeight: number | null;
        recommendedFeed: number | null;
        currentWeight: number | null;
        todayFeedKg: number | null;
        todayFeedCost: number | null;
        isWeightManual: boolean;
        isFeedManual: boolean;
        isUnderweight: boolean;
        feedPhase?: string;
        raisingPurpose?: 'UNDECIDED' | 'FATTENING' | 'BREEDING';
        raisingPurposeLabel?: string;
        weightBasis?: 'birth' | 'purchase';
        purchaseWeight?: number | null;
        weeksOnFarm?: number | null;
    };
    financials: {
        monthlyFeedingCost: number;
        actualMonthlyFeedKg: number;
        theoreticalMonthlyFeedKg: number;
        totalInvestment: number;
        feedPricePerKg?: number;
        feedPriceStarter?: number;
        feedPriceGrowth?: number;
        feedPriceFinish?: number;
        livePigSalePricePerKg?: number;
        liveSaleEstimate?: number;
        simpleFinanceMode?: boolean;
    };
}

export interface Piglet {
    id: number;
    name?: string;
    birthDate: string;
    status: 'ALIVE' | 'DEAD' | 'SOLD' | 'KEPT';
    deathDate?: string;
    saleDate?: string;
    salePrice?: number;
    saleType?: 'PIGLET_UNIT' | 'LIVE_KG' | 'CARCASS_KG';
    saleWeightKg?: number;
    salePricePerKg?: number;
    motherId: number;
    fatherId?: number;
    _pendingSync?: boolean;
}

export interface FarmContact {
    id: string;
    type: 'VET' | 'FEED_SUPPLIER' | 'SECURITY' | 'OTHER';
    name: string;
    phone?: string;
    location?: string;
    notes?: string;
    source?: 'manual' | 'web';
    _pendingSync?: boolean;
}

export interface ContactSearchPreferences {
    farmBaseLocation: string;
    allowedZones: string[];
    blockedFarZones: string[];
    maxDistanceHintKm: number;
    farmCoordinates?: { latitude: number; longitude: number };
}

export interface WatchAlert {
    id: number;
    type: 'DISEASE' | 'THEFT' | 'SUPPLY' | 'OTHER';
    title: string;
    details?: string;
    location?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
    source: 'MANUAL' | 'WEB' | 'AI';
    createdAt: string;
    _pendingSync?: boolean;
}
