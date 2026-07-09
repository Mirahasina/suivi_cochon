import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContactSearchPreferences, FarmContact, Pig, Piglet, VaccineSuggestion, VaccineType, WatchAlert } from './types';

const KEYS = {
    pigs: '@suivi_cochon/local/pigs',
    pigDetail: (id: number) => `@suivi_cochon/local/pig/${id}`,
    piglets: (motherId: number) => `@suivi_cochon/local/piglets/${motherId}`,
    vaccineTypes: '@suivi_cochon/local/vaccine_types',
    healthSuggested: '@suivi_cochon/local/health_suggested',
    healthUpcoming: '@suivi_cochon/local/health_upcoming',
    contacts: '@suivi_cochon/local/contacts',
    contactPrefs: '@suivi_cochon/local/contact_prefs',
    watchAlerts: '@suivi_cochon/local/watch_alerts',
    tempIdCounter: '@suivi_cochon/local/temp_id_counter',
    idMap: '@suivi_cochon/local/id_map',
};

export type TempIdMap = Record<string, number>;

export async function getIdMap(): Promise<TempIdMap> {
    const raw = await AsyncStorage.getItem(KEYS.idMap);
    return raw ? JSON.parse(raw) : {};
}

export async function setIdMap(map: TempIdMap) {
    await AsyncStorage.setItem(KEYS.idMap, JSON.stringify(map));
}

export async function mapTempToServer(tempId: number, serverId: number) {
    const map = await getIdMap();
    map[String(tempId)] = serverId;
    await setIdMap(map);
}

export function resolvePigId(id: number, map: TempIdMap): number {
    return map[String(id)] ?? id;
}

export async function allocateTempPigId(): Promise<number> {
    const raw = await AsyncStorage.getItem(KEYS.tempIdCounter);
    let next = raw ? Number(raw) : -1;
    await AsyncStorage.setItem(KEYS.tempIdCounter, String(next - 1));
    return next;
}

export async function savePigsList(pigs: Pig[]) {
    await AsyncStorage.setItem(KEYS.pigs, JSON.stringify(pigs));
}

export async function getPigsList(): Promise<Pig[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.pigs);
    return raw ? JSON.parse(raw) : null;
}

export async function savePigDetail(pig: Pig) {
    await savePigDetailOnly(pig);
    const list = (await getPigsList()) || [];
    const idx = list.findIndex((p) => p.id === pig.id);
    const summary = { ...pig };
    if (idx >= 0) list[idx] = summary as Pig;
    else list.unshift(summary as Pig);
    await savePigsList(list);
}

async function savePigDetailOnly(pig: Pig) {
    await AsyncStorage.setItem(KEYS.pigDetail(pig.id), JSON.stringify(pig));
}

export async function getPigDetail(id: number): Promise<Pig | null> {
    const raw = await AsyncStorage.getItem(KEYS.pigDetail(id));
    if (raw) return JSON.parse(raw);
    const list = await getPigsList();
    return list?.find((p) => p.id === id) ?? null;
}

export async function patchPigLocal(id: number, patch: Partial<Pig>) {
    const pig = (await getPigDetail(id)) || (await getPigsList())?.find((p) => p.id === id);
    if (!pig) return;
    const updated = { ...pig, ...patch, _pendingSync: true } as Pig;
    await savePigDetail(updated);
}

export async function removePigLocal(id: number) {
    await AsyncStorage.removeItem(KEYS.pigDetail(id));
    const list = (await getPigsList()) || [];
    await savePigsList(list.filter((p) => p.id !== id));
}

export async function addPigLocal(pig: Pig) {
    await savePigDetail(pig);
}

export async function remapPigIdInStore(tempId: number, serverId: number) {
    const detail = await getPigDetail(tempId);
    if (detail) {
        await AsyncStorage.removeItem(KEYS.pigDetail(tempId));
        await savePigDetail({ ...detail, id: serverId, _pendingSync: false });
    }
    const list = (await getPigsList()) || [];
    await savePigsList(
        list.map((p) => (p.id === tempId ? { ...p, id: serverId, _pendingSync: false } : p)),
    );
    await mapTempToServer(tempId, serverId);
}

export async function savePiglets(motherId: number, piglets: Piglet[]) {
    await AsyncStorage.setItem(KEYS.piglets(motherId), JSON.stringify(piglets));
}

export async function getPiglets(motherId: number): Promise<Piglet[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.piglets(motherId));
    return raw ? JSON.parse(raw) : null;
}

export async function saveVaccineTypes(types: VaccineType[]) {
    await AsyncStorage.setItem(KEYS.vaccineTypes, JSON.stringify(types));
}

export async function getVaccineTypes(): Promise<VaccineType[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.vaccineTypes);
    return raw ? JSON.parse(raw) : null;
}

export async function saveHealthSuggested(data: VaccineSuggestion[]) {
    await AsyncStorage.setItem(KEYS.healthSuggested, JSON.stringify(data));
}

export async function getHealthSuggested(): Promise<VaccineSuggestion[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.healthSuggested);
    return raw ? JSON.parse(raw) : null;
}

export async function saveHealthUpcoming(data: unknown[]) {
    await AsyncStorage.setItem(KEYS.healthUpcoming, JSON.stringify(data));
}

export async function getHealthUpcoming(): Promise<unknown[] | null> {
    const raw = await AsyncStorage.getItem(KEYS.healthUpcoming);
    return raw ? JSON.parse(raw) : null;
}

export async function getFarmContacts(): Promise<FarmContact[]> {
    const raw = await AsyncStorage.getItem(KEYS.contacts);
    return raw ? JSON.parse(raw) : [];
}

export async function saveFarmContacts(contacts: FarmContact[]) {
    await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(contacts));
}

export async function upsertFarmContact(contact: FarmContact) {
    const contacts = await getFarmContacts();
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) contacts[idx] = contact;
    else contacts.unshift(contact);
    await saveFarmContacts(contacts);
}

const DEFAULT_CONTACT_PREFS: ContactSearchPreferences = {
    farmBaseLocation: 'Manjakandriana',
    allowedZones: ['Manjakandriana', 'Antananarivo'],
    blockedFarZones: ['Fianarantsoa', 'Tulear', 'Toliara', 'Mahajanga'],
    maxDistanceHintKm: 80,
    farmCoordinates: undefined,
};

export async function getContactSearchPreferences(): Promise<ContactSearchPreferences> {
    const raw = await AsyncStorage.getItem(KEYS.contactPrefs);
    return raw ? { ...DEFAULT_CONTACT_PREFS, ...JSON.parse(raw) } : DEFAULT_CONTACT_PREFS;
}

export async function saveContactSearchPreferences(prefs: Partial<ContactSearchPreferences>) {
    const current = await getContactSearchPreferences();
    await AsyncStorage.setItem(KEYS.contactPrefs, JSON.stringify({ ...current, ...prefs }));
}

export async function getWatchAlerts(): Promise<WatchAlert[]> {
    const raw = await AsyncStorage.getItem(KEYS.watchAlerts);
    return raw ? JSON.parse(raw) : [];
}

export async function saveWatchAlerts(alerts: WatchAlert[]) {
    await AsyncStorage.setItem(KEYS.watchAlerts, JSON.stringify(alerts));
}

export async function upsertWatchAlert(alert: WatchAlert) {
    const list = await getWatchAlerts();
    const idx = list.findIndex((a) => a.id === alert.id);
    if (idx >= 0) list[idx] = alert;
    else list.unshift(alert);
    await saveWatchAlerts(list);
}

export function buildOfflinePig(data: Partial<Pig> & { name: string }, tempId: number): Pig {
    const now = new Date().toISOString();
    return {
        id: tempId,
        name: data.name,
        breed: data.breed || 'Local (Gasy)',
        gender: data.gender || 'FEMALE',
        birthDate: data.birthDate || now,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        initialWeight: data.initialWeight,
        isCastrated: false,
        nursingPiglets: 0,
        status: 'ACTIVE',
        ageFormatted: '—',
        ageInWeeks: 0,
        vaccinations: [],
        weightChart: [],
        normCurve: [],
        _pendingSync: true,
        currentStatus: {
            expectedWeight: data.initialWeight ?? null,
            recommendedFeed: null,
            currentWeight: data.initialWeight ?? null,
            todayFeedKg: null,
            todayFeedCost: null,
            isWeightManual: !!data.initialWeight,
            isFeedManual: false,
            isUnderweight: false,
        },
        financials: {
            monthlyFeedingCost: 0,
            actualMonthlyFeedKg: 0,
            theoreticalMonthlyFeedKg: 0,
            totalInvestment: Number(data.purchasePrice || 0),
        },
    } as Pig;
}
