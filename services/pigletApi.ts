import api from './api';

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
