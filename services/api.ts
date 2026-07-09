import axios from 'axios';
import { enqueue, isNetworkError } from './offlineQueue';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://suivi-cochon1.onrender.com';


const api = axios.create({
    timeout: 90000,
    baseURL: API_URL,
});

api.interceptors.response.use(
    response => response,
    error => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export interface VaccineType {
    id: number;
    name: string;
    description?: string;
    defaultRecallDays: number;
    target: 'PIGLET' | 'SOW' | 'BOAR' | 'GILT' | 'ALL';
    injectionRoute: string;
    injectionSite?: string;
    timingNote?: string;
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

export const pigService = {
    getAll: async () => {
        const response = await api.get<Pig[]>('/pigs');
        return response.data;
    },

    getOne: async (id: number) => {
        const response = await api.get<Pig>(`/pigs/${id}`);
        return response.data;
    },

    create: async (data: Partial<Pig>) => {
        try {
            const response = await api.post<Pig>('/pigs', data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'CREATE_PIG', payload: data as Record<string, unknown> });
                return { queued: true, ...data } as any;
            }
            throw error;
        }
    },

    update: async (id: number, data: Partial<Pig>) => {
        const response = await api.patch<Pig>(`/pigs/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete(`/pigs/${id}`);
        return response.data;
    },

    addWeight: async (id: number, weight: number) => {
        try {
            const response = await api.post(`/pigs/${id}/weight`, { weight });
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'ADD_WEIGHT', payload: { pigId: id, weight } });
                return { queued: true };
            }
            throw error;
        }
    },

    addFeeding: async (id: number, quantityKg: number, costAriary: number) => {
        try {
            const response = await api.post(`/pigs/${id}/feeding`, { quantityKg, costAriary });
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'ADD_FEEDING', payload: { pigId: id, quantityKg, costAriary } });
                return { queued: true };
            }
            throw error;
        }
    },

    recordMating: async (id: number, partnerId?: number, date?: string, isExternal?: boolean, partnerName?: string) => {
        const response = await api.post(`/pigs/${id}/mating`, { partnerId, date, isExternal, partnerName });
        return response.data;
    },

    castrate: async (id: number) => {
        const response = await api.put(`/pigs/${id}/castrate`);
        return response.data;
    },

    sell: async (
        id: number,
        data: {
            saleType: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT';
            pricePerKg?: number;
            weightKg?: number;
            totalPrice?: number;
            date?: string;
        },
    ) => {
        const response = await api.post(`/pigs/${id}/sell`, data);
        return response.data;
    },

    importBulk: async (pigs: Partial<Pig>[]) => {
        const response = await api.post('/pigs/bulk', { pigs });
        return response.data;
    },

    setQuarantine: async (id: number, isQuarantined: boolean, reason?: string) => {
        const response = await api.post(`/pigs/${id}/quarantine`, { isQuarantined, reason });
        return response.data;
    },

    setRaisingPurpose: async (id: number, purpose: 'UNDECIDED' | 'FATTENING' | 'BREEDING') => {
        const response = await api.patch(`/pigs/${id}/raising-purpose`, { purpose });
        return response.data;
    },
};

export const healthService = {
    getVaccineTypes: async () => {
        const response = await api.get<VaccineType[]>('/health/vaccines');
        return response.data;
    },

    getUpcoming: async () => {
        const response = await api.get('/health/upcoming');
        return response.data;
    },

    getSuggested: async () => {
        const response = await api.get<VaccineSuggestion[]>('/health/suggested');
        return response.data;
    },

    getSuggestedForPig: async (pigId: number) => {
        const response = await api.get<VaccineSuggestion[]>(`/health/suggested/${pigId}`);
        return response.data;
    },

    recordVaccination: async (data: { pigId: number; vaccineTypeId: number; date: string; notes?: string }) => {
        try {
            const response = await api.post('/health/record', data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'RECORD_VACCINATION', payload: data });
                return { queued: true };
            }
            throw error;
        }
    },

    getBiosecurity: async () => {
        const response = await api.get('/health/biosecurity');
        return response.data as {
            title: string;
            alert: string;
            symptoms: string[];
            prevention: string[];
        };
    },
};

export interface Building {
    id: number;
    name: string;
    capacity?: number;
    location?: string;
    batches?: Batch[];
}

export interface Batch {
    id: number;
    name: string;
    startDate?: string;
    status: 'ACTIVE' | 'CLOSED';
    building?: Building;
    pigs?: Pig[];
}

export const buildingService = {
    getAll: async () => {
        const response = await api.get<Building[]>('/buildings');
        return response.data;
    },
    create: async (data: { name: string; capacity?: number; location?: string }) => {
        const response = await api.post('/buildings', data);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/buildings/${id}`);
    },
};

export const batchService = {
    getAll: async () => {
        const response = await api.get<Batch[]>('/batches');
        return response.data;
    },
    create: async (data: { name: string; startDate?: string; buildingId?: number }) => {
        const response = await api.post('/batches', data);
        return response.data;
    },
    update: async (id: number, data: Partial<Batch> & { buildingId?: number }) => {
        const response = await api.patch(`/batches/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/batches/${id}`);
    },
};

export const reportService = {
    getMonthly: async () => {
        const response = await api.get('/reports/monthly');
        return response.data;
    },
};

export interface FeedIngredient {
    name: string;
    percentKg: number;
    costPerKg: number;
}

export interface FeedRecipe {
    id: number;
    name: string;
    costPerKg: number;
    ingredients: string;
    isActive: boolean;
}

export const feedRecipeService = {
    getAll: async () => {
        const response = await api.get<FeedRecipe[]>('/feed-recipes');
        return response.data;
    },
    create: async (data: { name: string; ingredients: FeedIngredient[] }) => {
        const response = await api.post('/feed-recipes', data);
        return response.data;
    },
    activate: async (id: number) => {
        const response = await api.patch(`/feed-recipes/${id}/activate`);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/feed-recipes/${id}`);
    },
};

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
}

export interface RecordFarrowingRequest {
    motherId: number;
    actualDate: string;
    bornAlive: number;
    stillborn: number;
    fatherId?: number;
}

export const pigletService = {
    recordFarrowing: async (data: RecordFarrowingRequest) => {
        const response = await api.post('/piglets/farrowing', data);
        return response.data;
    },

    getByMother: async (motherId: number) => {
        const response = await api.get<Piglet[]>(`/piglets/mother/${motherId}`);
        return response.data;
    },

    sell: async (
        pigletId: number,
        data: {
            saleType: 'PIGLET_UNIT' | 'LIVE_KG' | 'CARCASS_KG';
            totalPrice?: number;
            pricePerKg?: number;
            weightKg?: number;
            date?: string;
        },
    ) => {
        const response = await api.patch(`/piglets/${pigletId}/sell`, data);
        return response.data;
    },

    markDead: async (pigletId: number, date?: string) => {
        const response = await api.patch(`/piglets/${pigletId}/died`, { date });
        return response.data;
    },
};


export default api;
