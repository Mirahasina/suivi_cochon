import * as Linking from 'expo-linking';
import { ContactSearchPreferences } from './types';

function buildZoneQuery(prefs: ContactSearchPreferences) {
    const zones = prefs.allowedZones.filter(Boolean).join(' OR ');
    return zones || prefs.farmBaseLocation || 'Madagascar';
}

export async function searchVetOnline(prefs: ContactSearchPreferences) {
    const q = encodeURIComponent(`vétérinaire porcin ${buildZoneQuery(prefs)} Madagascar`);
    await Linking.openURL(`https://www.google.com/search?q=${q}`);
}

export async function searchFeedSupplierOnline(prefs: ContactSearchPreferences) {
    const q = encodeURIComponent(`distributeur aliment porc ${buildZoneQuery(prefs)} Madagascar`);
    await Linking.openURL(`https://www.google.com/search?q=${q}`);
}

export async function searchOnFacebook(kind: 'vet' | 'feed', prefs: ContactSearchPreferences) {
    const query =
        kind === 'vet'
            ? `vétérinaire élevage porc ${buildZoneQuery(prefs)}`
            : `aliment porcin provende ${buildZoneQuery(prefs)}`;
    await Linking.openURL(`https://www.facebook.com/search/top?q=${encodeURIComponent(query)}`);
}

export async function searchRecentDiseaseNews(prefs: ContactSearchPreferences) {
    const q = encodeURIComponent(`maladie porcine ${buildZoneQuery(prefs)} Madagascar actualité`);
    await Linking.openURL(`https://www.google.com/search?q=${q}&tbm=nws`);
}

export async function searchRecentTheftNews(prefs: ContactSearchPreferences) {
    const q = encodeURIComponent(`vol élevage ${buildZoneQuery(prefs)} Madagascar actualité`);
    await Linking.openURL(`https://www.google.com/search?q=${q}&tbm=nws`);
}

