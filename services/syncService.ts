import NetInfo from '@react-native-community/netinfo';
import { QueryClient } from '@tanstack/react-query';
import api from './api';
import { flushQueue } from './offlineQueue';
import {
    getWatchAlerts,
    saveHealthSuggested,
    saveHealthUpcoming,
    savePigDetail,
    savePiglets,
    savePigsList,
    saveVaccineTypes,
    saveWatchAlerts,
} from './localStore';
import { scheduleNotification } from '../utils/notifications';
import { Pig } from './types';

let syncInProgress = false;
let netInfoUnsubscribe: (() => void) | null = null;

export async function checkServerReachable(): Promise<boolean> {
    try {
        await api.get('/ping', { timeout: 8000 });
        return true;
    } catch {
        return false;
    }
}

async function pullFreshData() {
    const previousAlerts = await getWatchAlerts().catch(() => []);
    const previousIds = new Set(previousAlerts.map((a: any) => a.id));

    const [pigsRes, vaccinesRes, suggestedRes, upcomingRes, watchRes] = await Promise.allSettled([
        api.get<Pig[]>('/pigs'),
        api.get('/health/vaccines'),
        api.get('/health/suggested'),
        api.get('/health/upcoming'),
        api.get('/watch/alerts'),
    ]);

    if (pigsRes.status === 'fulfilled') {
        await savePigsList(pigsRes.value.data);
        await Promise.allSettled(
            pigsRes.value.data
                .filter((p) => p.status === 'ACTIVE')
                .slice(0, 30)
                .map(async (p) => {
                    const detail = await api.get<Pig>(`/pigs/${p.id}`);
                    await savePigDetail(detail.data);
                }),
        );
    }
    if (vaccinesRes.status === 'fulfilled') await saveVaccineTypes(vaccinesRes.value.data);
    if (suggestedRes.status === 'fulfilled') await saveHealthSuggested(suggestedRes.value.data);
    if (upcomingRes.status === 'fulfilled') await saveHealthUpcoming(upcomingRes.value.data);
    if (watchRes.status === 'fulfilled') {
        await saveWatchAlerts(watchRes.value.data);
        const newOpenAlerts = (watchRes.value.data || []).filter(
            (a: any) => !previousIds.has(a.id) && a.status === 'OPEN',
        );
        for (const alert of newOpenAlerts.slice(0, 3)) {
            const typeLabel =
                alert.type === 'DISEASE'
                    ? 'Maladie'
                    : alert.type === 'THEFT'
                      ? 'Vol'
                      : alert.type === 'SUPPLY'
                        ? 'Rupture'
                        : 'Alerte';
            await scheduleNotification(
                `Nouvelle alerte: ${typeLabel}`,
                `${alert.title}${alert.location ? ` (${alert.location})` : ''}`,
            );
        }
    }

    if (pigsRes.status === 'fulfilled') {
        const females = pigsRes.value.data.filter((p) => p.gender === 'FEMALE' && p.status === 'ACTIVE');
        await Promise.allSettled(
            females.slice(0, 20).map(async (f) => {
                const res = await api.get(`/piglets/mother/${f.id}`);
                await savePiglets(f.id, res.data);
            }),
        );
    }
}

export async function syncAll(queryClient?: QueryClient): Promise<{
    online: boolean;
    synced: number;
    failed: number;
}> {
    if (syncInProgress) return { online: false, synced: 0, failed: 0 };
    syncInProgress = true;
    try {
        const online = await checkServerReachable();
        if (!online) return { online: false, synced: 0, failed: 0 };

        const result = await flushQueue();
        await pullFreshData();
        queryClient?.invalidateQueries();
        return { online: true, ...result };
    } finally {
        syncInProgress = false;
    }
}

export function startAutoSync(queryClient: QueryClient) {
    if (netInfoUnsubscribe) return;

    netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
            syncAll(queryClient).catch(() => {});
        }
    });

    NetInfo.fetch().then((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
            syncAll(queryClient).catch(() => {});
        }
    });
}

export function stopAutoSync() {
    netInfoUnsubscribe?.();
    netInfoUnsubscribe = null;
}
