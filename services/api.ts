import axios from 'axios';
import {
    addPigLocal,
    allocateTempPigId,
    buildOfflinePig,
    getHealthSuggested,
    getHealthUpcoming,
    getPigDetail,
    getPiglets,
    getPigsList,
    getVaccineTypes,
    patchPigLocal,
    removePigLocal,
    saveHealthSuggested,
    saveHealthUpcoming,
    savePigDetail,
    savePiglets,
    savePigsList,
    saveVaccineTypes,
    getWatchAlerts,
    saveWatchAlerts,
    upsertWatchAlert,
} from './localStore';
import { enqueue, isNetworkError, queued } from './offlineQueue';
import type { Pig, Piglet, VaccineSuggestion, VaccineType, WatchAlert } from './types';

export type { Pig, Piglet, VaccineSuggestion, VaccineType, Vaccination, WatchAlert, Expense, ExpenseCategory, FinanceSummary } from './types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://suivi-cochon1.onrender.com';

const api = axios.create({
    timeout: 90000,
    baseURL: API_URL,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    },
);

export const pigService = {
    getAll: async () => {
        try {
            const response = await api.get<Pig[]>('/pigs');
            await savePigsList(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getPigsList();
                if (local) return local;
            }
            throw error;
        }
    },

    getOne: async (id: number) => {
        try {
            const response = await api.get<Pig>(`/pigs/${id}`);
            await savePigDetail(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getPigDetail(id);
                if (local) return local;
            }
            throw error;
        }
    },

    create: async (data: Partial<Pig> & Record<string, unknown>) => {
        try {
            const response = await api.post<Pig>('/pigs', data);
            await savePigDetail(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const tempId = await allocateTempPigId();
                const offlinePig = buildOfflinePig(
                    { name: String(data.name || 'Cochon'), ...data } as Pig,
                    tempId,
                );
                await addPigLocal(offlinePig);
                await enqueue({
                    type: 'CREATE_PIG',
                    payload: { ...data, _tempId: tempId },
                });
                return { ...queued, ...offlinePig };
            }
            throw error;
        }
    },

    update: async (id: number, data: Partial<Pig>) => {
        try {
            const response = await api.patch<Pig>(`/pigs/${id}`, data);
            await savePigDetail(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, data);
                await enqueue({ type: 'UPDATE_PIG', payload: { pigId: id, data } });
                return { ...queued };
            }
            throw error;
        }
    },

    delete: async (id: number) => {
        try {
            await api.delete(`/pigs/${id}`);
            await removePigLocal(id);
            return { success: true };
        } catch (error) {
            if (isNetworkError(error)) {
                await removePigLocal(id);
                await enqueue({ type: 'DELETE_PIG', payload: { pigId: id } });
                return { ...queued };
            }
            throw error;
        }
    },

    addWeight: async (id: number, weight: number) => {
        try {
            const response = await api.post(`/pigs/${id}/weight`, { weight });
            const pig = await pigService.getOne(id).catch(() => null);
            if (pig) {
                await patchPigLocal(id, {
                    currentStatus: {
                        ...pig.currentStatus,
                        currentWeight: weight,
                        isWeightManual: true,
                    },
                } as Partial<Pig>);
            }
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const pig = await getPigDetail(id);
                if (pig) {
                    await patchPigLocal(id, {
                        currentStatus: {
                            ...pig.currentStatus,
                            currentWeight: weight,
                            isWeightManual: true,
                        },
                    } as Partial<Pig>);
                }
                await enqueue({ type: 'ADD_WEIGHT', payload: { pigId: id, weight } });
                return { ...queued };
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
                const pig = await getPigDetail(id);
                if (pig) {
                    await patchPigLocal(id, {
                        currentStatus: {
                            ...pig.currentStatus,
                            todayFeedKg: quantityKg,
                            todayFeedCost: costAriary,
                            isFeedManual: true,
                        },
                    } as Partial<Pig>);
                }
                await enqueue({ type: 'ADD_FEEDING', payload: { pigId: id, quantityKg, costAriary } });
                return { ...queued };
            }
            throw error;
        }
    },

    recordMating: async (
        id: number,
        partnerId?: number,
        date?: string,
        isExternal?: boolean,
        partnerName?: string,
    ) => {
        try {
            const response = await api.post(`/pigs/${id}/mating`, { partnerId, date, isExternal, partnerName });
            await pigService.getOne(id).catch(() => {});
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, {
                    matingDate: date || new Date().toISOString(),
                    partnerId,
                    raisingPurpose: 'BREEDING',
                } as Partial<Pig>);
                await enqueue({
                    type: 'RECORD_MATING',
                    payload: { pigId: id, partnerId, date, isExternal, partnerName },
                });
                return { ...queued };
            }
            throw error;
        }
    },

    castrate: async (id: number) => {
        try {
            const response = await api.put(`/pigs/${id}/castrate`);
            await pigService.getOne(id).catch(() => {});
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, {
                    isCastrated: true,
                    raisingPurpose: 'FATTENING',
                } as Partial<Pig>);
                await enqueue({ type: 'CASTRATE', payload: { pigId: id } });
                return { ...queued };
            }
            throw error;
        }
    },

    sell: async (
        id: number,
        data: {
            saleType: 'CARCASS_KG' | 'LIVE_KG' | 'UNIT';
            pricePerKg?: number;
            weightKg?: number;
            liveWeightKg?: number;
            totalPrice?: number;
            date?: string;
        },
    ) => {
        try {
            const response = await api.post(`/pigs/${id}/sell`, data);
            await patchPigLocal(id, { status: 'SOLD', salePrice: data.totalPrice } as Partial<Pig>);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, { status: 'SOLD', salePrice: data.totalPrice } as Partial<Pig>);
                await enqueue({ type: 'SELL_PIG', payload: { pigId: id, data } });
                return { ...queued };
            }
            throw error;
        }
    },

    importBulk: async (pigs: Partial<Pig>[]) => {
        const response = await api.post('/pigs/bulk', { pigs });
        return response.data;
    },

    setQuarantine: async (id: number, isQuarantined: boolean, reason?: string) => {
        try {
            const response = await api.post(`/pigs/${id}/quarantine`, { isQuarantined, reason });
            await pigService.getOne(id).catch(() => {});
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, { isQuarantined, quarantineReason: reason } as Partial<Pig>);
                await enqueue({ type: 'SET_QUARANTINE', payload: { pigId: id, isQuarantined, reason } });
                return { ...queued };
            }
            throw error;
        }
    },

    setRaisingPurpose: async (id: number, purpose: 'UNDECIDED' | 'FATTENING' | 'BREEDING') => {
        try {
            const response = await api.patch(`/pigs/${id}/raising-purpose`, { purpose });
            await pigService.getOne(id).catch(() => {});
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await patchPigLocal(id, { raisingPurpose: purpose } as Partial<Pig>);
                await enqueue({ type: 'SET_RAISING_PURPOSE', payload: { pigId: id, purpose } });
                return { ...queued };
            }
            throw error;
        }
    },
};

export const healthService = {
    getVaccineTypes: async () => {
        try {
            const response = await api.get<VaccineType[]>('/health/vaccines');
            await saveVaccineTypes(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getVaccineTypes();
                if (local) return local;
            }
            throw error;
        }
    },

    createVaccineType: async (data: {
        name: string;
        defaultRecallDays: number;
        target?: VaccineType['target'];
        injectionRoute?: string;
        description?: string;
        timingNote?: string;
    }) => {
        const response = await api.post<VaccineType>('/health/vaccines', data);
        const list = [...((await getVaccineTypes()) || []).filter((v) => v.id !== response.data.id), response.data];
        await saveVaccineTypes(list);
        return response.data;
    },

    setVaccineEnabled: async (id: number, isEnabled: boolean) => {
        const response = await api.patch<VaccineType>(`/health/vaccines/${id}/enabled`, { isEnabled });
        const list = (await getVaccineTypes()) || [];
        await saveVaccineTypes(list.map((v) => (v.id === id ? response.data : v)));
        return response.data;
    },

    deleteCustomVaccine: async (id: number) => {
        await api.delete(`/health/vaccines/${id}`);
        const list = (await getVaccineTypes()) || [];
        await saveVaccineTypes(list.filter((v) => v.id !== id));
        return { ok: true };
    },

    getUpcoming: async () => {
        try {
            const response = await api.get('/health/upcoming');
            await saveHealthUpcoming(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getHealthUpcoming();
                if (local) return local;
            }
            throw error;
        }
    },

    getSuggested: async () => {
        try {
            const response = await api.get<VaccineSuggestion[]>('/health/suggested');
            await saveHealthSuggested(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getHealthSuggested();
                if (local) return local;
            }
            throw error;
        }
    },

    getSuggestedForPig: async (pigId: number) => {
        try {
            const response = await api.get<VaccineSuggestion[]>(`/health/suggested/${pigId}`);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const all = await getHealthSuggested();
                if (all) return all.filter((s) => s.pigId === pigId);
            }
            throw error;
        }
    },

    recordVaccination: async (data: {
        pigId: number;
        vaccineTypeId: number;
        date: string;
        notes?: string;
    }) => {
        try {
            const response = await api.post('/health/record', data);
            await pigService.getOne(data.pigId).catch(() => {});
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'RECORD_VACCINATION', payload: data });
                return { ...queued };
            }
            throw error;
        }
    },

    getBiosecurity: async () => {
        try {
            const response = await api.get('/health/biosecurity');
            return response.data as {
                title: string;
                alert: string;
                symptoms: string[];
                prevention: string[];
            };
        } catch (error) {
            if (isNetworkError(error)) {
                return {
                    title: 'PPA — mode hors ligne',
                    alert: 'Connectez-vous pour les alertes à jour.',
                    symptoms: [],
                    prevention: [],
                };
            }
            throw error;
        }
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

export const expenseService = {
    getAll: async () => {
        const response = await api.get<import('./types').Expense[]>('/expenses');
        return response.data;
    },
    create: async (data: {
        amountAriary: number;
        category?: import('./types').ExpenseCategory;
        note?: string;
        date?: string;
    }) => {
        const response = await api.post('/expenses', data);
        return response.data;
    },
    delete: async (id: number) => {
        await api.delete(`/expenses/${id}`);
    },
};

export const financeService = {
    getSummary: async (month?: number, year?: number) => {
        const params: Record<string, number> = {};
        if (month != null) params.month = month;
        if (year != null) params.year = year;
        const response = await api.get<import('./types').FinanceSummary>('/finance/summary', { params });
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

export interface RecordFarrowingRequest {
    motherId: number;
    actualDate: string;
    bornAlive: number;
    stillborn: number;
    fatherId?: number;
}

export const pigletService = {
    recordFarrowing: async (data: RecordFarrowingRequest) => {
        try {
            const response = await api.post('/piglets/farrowing', data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'RECORD_FARROWING', payload: data as unknown as Record<string, unknown> });
                return { ...queued };
            }
            throw error;
        }
    },

    getByMother: async (motherId: number) => {
        try {
            const response = await api.get<Piglet[]>(`/piglets/mother/${motherId}`);
            await savePiglets(motherId, response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getPiglets(motherId);
                if (local) return local;
            }
            throw error;
        }
    },

    sell: async (
        pigletId: number,
        data: {
            saleType: 'PIGLET_UNIT' | 'LIVE_KG' | 'CARCASS_KG';
            totalPrice?: number;
            pricePerKg?: number;
            weightKg?: number;
            liveWeightKg?: number;
            date?: string;
        },
    ) => {
        try {
            const response = await api.patch(`/piglets/${pigletId}/sell`, data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'SELL_PIGLET', payload: { pigletId, data } });
                return { ...queued };
            }
            throw error;
        }
    },

    markDead: async (pigletId: number, date?: string) => {
        try {
            const response = await api.patch(`/piglets/${pigletId}/died`, { date });
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'MARK_PIGLET_DEAD', payload: { pigletId, date } });
                return { ...queued };
            }
            throw error;
        }
    },
};

export const watchService = {
    getAlerts: async (status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') => {
        try {
            const response = await api.get<WatchAlert[]>('/watch/alerts', { params: status ? { status } : {} });
            await saveWatchAlerts(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                return getWatchAlerts();
            }
            throw error;
        }
    },
    report: async (data: {
        type: 'DISEASE' | 'THEFT' | 'SUPPLY' | 'OTHER';
        title: string;
        details?: string;
        location?: string;
        source?: 'MANUAL' | 'WEB' | 'AI';
    }) => {
        try {
            const response = await api.post<WatchAlert>('/watch/report', data);
            await upsertWatchAlert(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local: WatchAlert = {
                    id: Date.now(),
                    type: data.type,
                    title: data.title,
                    details: data.details,
                    location: data.location,
                    source: data.source || 'MANUAL',
                    severity: 'MEDIUM',
                    status: 'OPEN',
                    createdAt: new Date().toISOString(),
                    _pendingSync: true,
                };
                await upsertWatchAlert(local);
                await enqueue({ type: 'WATCH_REPORT', payload: data as Record<string, unknown> });
                return { ...local, ...queued };
            }
            throw error;
        }
    },
    acknowledge: async (alertId: number) => {
        try {
            const response = await api.patch<WatchAlert>(`/watch/alerts/${alertId}/ack`);
            if (response.data) await upsertWatchAlert(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getWatchAlerts();
                const item = local.find((a) => a.id === alertId);
                if (item) await upsertWatchAlert({ ...item, status: 'ACKNOWLEDGED', _pendingSync: true });
                await enqueue({ type: 'WATCH_ACK', payload: { alertId } });
                return { ...queued };
            }
            throw error;
        }
    },
    resolve: async (alertId: number) => {
        try {
            const response = await api.patch<WatchAlert>(`/watch/alerts/${alertId}/resolve`);
            if (response.data) await upsertWatchAlert(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                const local = await getWatchAlerts();
                const item = local.find((a) => a.id === alertId);
                if (item) await upsertWatchAlert({ ...item, status: 'RESOLVED', _pendingSync: true });
                await enqueue({ type: 'WATCH_RESOLVE', payload: { alertId } });
                return { ...queued };
            }
            throw error;
        }
    },
};

export default api;
