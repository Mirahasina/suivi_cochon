import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { getIdMap, resolvePigId } from './localStore';

const QUEUE_KEY = '@suivi_cochon/offline_queue';

export type QueuedAction =
    | { id: string; type: 'CREATE_PIG'; payload: Record<string, unknown> & { _tempId?: number }; createdAt: string }
    | { id: string; type: 'UPDATE_PIG'; payload: { pigId: number; data: Record<string, unknown> }; createdAt: string }
    | { id: string; type: 'DELETE_PIG'; payload: { pigId: number }; createdAt: string }
    | { id: string; type: 'RECORD_VACCINATION'; payload: { pigId: number; vaccineTypeId: number; date: string; notes?: string }; createdAt: string }
    | { id: string; type: 'ADD_WEIGHT'; payload: { pigId: number; weight: number }; createdAt: string }
    | { id: string; type: 'ADD_FEEDING'; payload: { pigId: number; quantityKg: number; costAriary: number }; createdAt: string }
    | { id: string; type: 'RECORD_MATING'; payload: { pigId: number; partnerId?: number; date?: string; isExternal?: boolean; partnerName?: string }; createdAt: string }
    | { id: string; type: 'CASTRATE'; payload: { pigId: number }; createdAt: string }
    | { id: string; type: 'SELL_PIG'; payload: { pigId: number; data: Record<string, unknown> }; createdAt: string }
    | { id: string; type: 'SET_QUARANTINE'; payload: { pigId: number; isQuarantined: boolean; reason?: string }; createdAt: string }
    | { id: string; type: 'SET_RAISING_PURPOSE'; payload: { pigId: number; purpose: string }; createdAt: string }
    | { id: string; type: 'SELL_PIGLET'; payload: { pigletId: number; data: Record<string, unknown> }; createdAt: string }
    | { id: string; type: 'MARK_PIGLET_DEAD'; payload: { pigletId: number; date?: string }; createdAt: string }
    | { id: string; type: 'RECORD_FARROWING'; payload: Record<string, unknown>; createdAt: string }
    | { id: string; type: 'UPDATE_SETTINGS'; payload: Record<string, unknown>; createdAt: string }
    | { id: string; type: 'WATCH_REPORT'; payload: Record<string, unknown>; createdAt: string }
    | { id: string; type: 'WATCH_ACK'; payload: { alertId: number }; createdAt: string }
    | { id: string; type: 'WATCH_RESOLVE'; payload: { alertId: number }; createdAt: string };

async function readQueue(): Promise<QueuedAction[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
}

async function writeQueue(queue: QueuedAction[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueueLength(): Promise<number> {
    return (await readQueue()).length;
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

async function remapQueuePigIds(queue: QueuedAction[], tempId: number, serverId: number): Promise<QueuedAction[]> {
    return queue.map((action) => {
        const p = action.payload as { pigId?: number };
        if (p.pigId === tempId) {
            return { ...action, payload: { ...action.payload, pigId: serverId } } as QueuedAction;
        }
        return action;
    });
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
    let queue = await readQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: QueuedAction[] = [];
    const idMap = await getIdMap();

    for (const action of queue) {
        try {
            const { remapPigIdInStore } = await import('./localStore');

            switch (action.type) {
                case 'CREATE_PIG': {
                    const { _tempId, ...body } = action.payload;
                    const res = await api.post('/pigs', body);
                    if (_tempId && res.data?.id) {
                        await remapPigIdInStore(_tempId, res.data.id);
                        queue = await remapQueuePigIds(queue, _tempId, res.data.id);
                    }
                    break;
                }
                case 'UPDATE_PIG': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.patch(`/pigs/${pigId}`, action.payload.data);
                    break;
                }
                case 'DELETE_PIG': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.delete(`/pigs/${pigId}`);
                    break;
                }
                case 'RECORD_VACCINATION': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post('/health/record', { ...action.payload, pigId });
                    break;
                }
                case 'ADD_WEIGHT': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post(`/pigs/${pigId}/weight`, { weight: action.payload.weight });
                    break;
                }
                case 'ADD_FEEDING': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post(`/pigs/${pigId}/feeding`, {
                        quantityKg: action.payload.quantityKg,
                        costAriary: action.payload.costAriary,
                    });
                    break;
                }
                case 'RECORD_MATING': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post(`/pigs/${pigId}/mating`, action.payload);
                    break;
                }
                case 'CASTRATE': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.put(`/pigs/${pigId}/castrate`);
                    break;
                }
                case 'SELL_PIG': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post(`/pigs/${pigId}/sell`, action.payload.data);
                    break;
                }
                case 'SET_QUARANTINE': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.post(`/pigs/${pigId}/quarantine`, {
                        isQuarantined: action.payload.isQuarantined,
                        reason: action.payload.reason,
                    });
                    break;
                }
                case 'SET_RAISING_PURPOSE': {
                    const pigId = resolvePigId(action.payload.pigId, idMap);
                    await api.patch(`/pigs/${pigId}/raising-purpose`, { purpose: action.payload.purpose });
                    break;
                }
                case 'SELL_PIGLET':
                    await api.patch(`/piglets/${action.payload.pigletId}/sell`, action.payload.data);
                    break;
                case 'MARK_PIGLET_DEAD':
                    await api.patch(`/piglets/${action.payload.pigletId}/died`, { date: action.payload.date });
                    break;
                case 'RECORD_FARROWING':
                    await api.post('/piglets/farrowing', action.payload);
                    break;
                case 'UPDATE_SETTINGS':
                    await api.patch('/settings', action.payload);
                    break;
                case 'WATCH_REPORT':
                    await api.post('/watch/report', action.payload);
                    break;
                case 'WATCH_ACK':
                    await api.patch(`/watch/alerts/${action.payload.alertId}/ack`);
                    break;
                case 'WATCH_RESOLVE':
                    await api.patch(`/watch/alerts/${action.payload.alertId}/resolve`);
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

export const queued = { queued: true as const };
