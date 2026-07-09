import api from './api';
import { flushQueue } from './offlineQueue';

export async function checkServerReachable(): Promise<boolean> {
    try {
        await api.get('/ping', { timeout: 8000 });
        return true;
    } catch {
        return false;
    }
}

export async function syncAll(): Promise<{ online: boolean; synced: number; failed: number }> {
    const online = await checkServerReachable();
    if (!online) return { online: false, synced: 0, failed: 0 };

    const result = await flushQueue();
    return { online: true, ...result };
}
