import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { healthService, pigService } from './api';

const QUEUE_KEY = '@suivi_cochon/offline_queue';

export type QueuedAction =
    | { id: string; type: 'CREATE_PIG'; payload: Record<string, unknown>; createdAt: string }
    | { id: string; type: 'RECORD_VACCINATION'; payload: { pigId: number; vaccineTypeId: number; date: string; notes?: string }; createdAt: string }
    | { id: string; type: 'ADD_WEIGHT'; payload: { pigId: number; weight: number }; createdAt: string }
    | { id: string; type: 'ADD_FEEDING'; payload: { pigId: number; quantityKg: number; costAriary: number }; createdAt: string }
    | { id: string; type: 'UPDATE_FEED_PRICE'; payload: { feedPricePerKg: number }; createdAt: string };

async function readQueue(): Promise<QueuedAction[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedAction[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueueLength(): Promise<number> {
    const queue = await readQueue();
    return queue.length;
}

export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>) {
    const queue = await readQueue();
    const entry = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
    } as QueuedAction;
    queue.push(entry);
    await writeQueue(queue);
    return entry;
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
    const queue = await readQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
        try {
            switch (action.type) {
                case 'CREATE_PIG':
                    await pigService.create(action.payload as any);
                    break;
                case 'RECORD_VACCINATION':
                    await healthService.recordVaccination(action.payload);
                    break;
                case 'ADD_WEIGHT':
                    await pigService.addWeight(action.payload.pigId, action.payload.weight);
                    break;
                case 'ADD_FEEDING':
                    await pigService.addFeeding(action.payload.pigId, action.payload.quantityKg, action.payload.costAriary);
                    break;
                case 'UPDATE_FEED_PRICE':
                    await api.patch('/settings/feed-price', { feedPricePerKg: action.payload.feedPricePerKg });
                    break;
            }
            synced++;
        } catch {
            failed++;
            remaining.push(action);
        }
    }

    await writeQueue(remaining);
    return { synced, failed };
}

export function isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as { message?: string; code?: string; response?: unknown };
    return !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error';
}
