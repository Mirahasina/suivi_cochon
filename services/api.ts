import axios from 'axios';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.104:3000';


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
    financials: {
        monthlyFeedingCost: number;
        actualMonthlyFeedKg: number;
        theoreticalMonthlyFeedKg: number;
        totalInvestment: number;
    };
    currentStatus: {
        expectedWeight: number | null;
        recommendedFeed: number | null;
        isUnderweight: boolean;
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
        const response = await api.post<Pig>('/pigs', data);
        return response.data;
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
        const response = await api.post(`/pigs/${id}/weight`, { weight });
        return response.data;
    },

    addFeeding: async (id: number, quantityKg: number, costAriary: number) => {
        const response = await api.post(`/pigs/${id}/feeding`, { quantityKg, costAriary });
        return response.data;
    },

    recordMating: async (id: number, partnerId?: number, date?: string, isExternal?: boolean, partnerName?: string) => {
        const response = await api.post(`/pigs/${id}/mating`, { partnerId, date, isExternal, partnerName });
        return response.data;
    },

    castrate: async (id: number) => {
        const response = await api.put(`/pigs/${id}/castrate`);
        return response.data;
    },

    sell: async (id: number, price: number, date?: string) => {
        const response = await api.post(`/pigs/${id}/sell`, { price, date });
        return response.data;
    },
};

export const healthService = {
    getVaccineTypes: async () => {
        const response = await api.get('/health/vaccines');
        return response.data;
    },

    getUpcoming: async () => {
        const response = await api.get('/health/upcoming');
        return response.data;
    },

    recordVaccination: async (data: { pigId: number; vaccineTypeId: number; date: string; notes?: string }) => {
        const response = await api.post('/health/record', data);
        return response.data;
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

    sell: async (pigletId: number, price: number, date?: string) => {
        const response = await api.patch(`/piglets/${pigletId}/sell`, { price, date });
        return response.data;
    },

    markDead: async (pigletId: number, date?: string) => {
        const response = await api.patch(`/piglets/${pigletId}/died`, { date });
        return response.data;
    },
};


export default api;
