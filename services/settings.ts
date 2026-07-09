import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { enqueue, isNetworkError } from './offlineQueue';

const LOCAL_SETTINGS_KEY = '@suivi_cochon/settings';

export interface AppSettings {
    feedPricePerKg: number;
    feedPriceStarter: number;
    feedPriceGrowth: number;
    feedPriceFinish: number;
    livePigSalePricePerKg: number;
    carcassSalePricePerKg: number;
    pigletLivePriceWeek1_4: number;
    pigletLivePriceWeek5_8: number;
    pigletLivePriceWeek9_12: number;
    pigletLivePriceWeek13Plus: number;
    simpleFinanceMode: boolean;
    farmRegion: string;
}

const DEFAULTS: AppSettings = {
    feedPricePerKg: 2000,
    feedPriceStarter: 2200,
    feedPriceGrowth: 2000,
    feedPriceFinish: 1800,
    livePigSalePricePerKg: 12000,
    carcassSalePricePerKg: 10000,
    pigletLivePriceWeek1_4: 18000,
    pigletLivePriceWeek5_8: 15000,
    pigletLivePriceWeek9_12: 13000,
    pigletLivePriceWeek13Plus: 12000,
    simpleFinanceMode: false,
    farmRegion: 'Antananarivo',
};

async function getLocalSettings(): Promise<AppSettings> {
    const raw = await AsyncStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
}

async function setLocalSettings(settings: Partial<AppSettings>) {
    const current = await getLocalSettings();
    await AsyncStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

export const settingsService = {
    get: async (): Promise<AppSettings> => {
        try {
            const response = await api.get<AppSettings>('/settings');
            await setLocalSettings(response.data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) return getLocalSettings();
            throw error;
        }
    },

    update: async (data: Partial<AppSettings>) => {
        await setLocalSettings(data);
        try {
            const response = await api.patch('/settings', data);
            return response.data;
        } catch (error) {
            if (isNetworkError(error)) {
                await enqueue({ type: 'UPDATE_SETTINGS', payload: data as Record<string, unknown> });
                return { ...data, queued: true };
            }
            throw error;
        }
    },

    setFeedPrice: async (feedPricePerKg: number) => {
        return settingsService.update({ feedPriceGrowth: feedPricePerKg, feedPricePerKg });
    },
};
