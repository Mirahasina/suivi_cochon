import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Colors } from '../../constants/theme';
import { watchService } from '../../services/api';
import { askHybridAssistant, AssistantAnswer } from '../../services/assistantHybrid';
import {
    searchFeedSupplierOnline,
    searchOnFacebook,
    searchRecentDiseaseNews,
    searchRecentTheftNews,
    searchVetOnline,
} from '../../services/contactSearch';
import {
    getContactSearchPreferences,
    getFarmContacts,
    saveContactSearchPreferences,
    upsertFarmContact,
} from '../../services/localStore';
import type { ContactSearchPreferences, FarmContact, WatchAlert } from '../../services/types';

export default function AssistantScreen() {
    const quickPrompts = [
        'Poids de mes cochons',
        'Vaccins en retard',
        'Mon cochon est malade',
        'Maladie qui se propage autour',
        'Cherche un vétérinaire',
        'Rupture aliment',
    ];
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
    const [contacts, setContacts] = useState<FarmContact[]>([]);
    const [contactType, setContactType] = useState<FarmContact['type']>('VET');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactLocation, setContactLocation] = useState('');
    const [prefs, setPrefs] = useState<ContactSearchPreferences | null>(null);
    const [zonesText, setZonesText] = useState('');
    const [blockedText, setBlockedText] = useState('');
    const [geoLoading, setGeoLoading] = useState(false);
    const [watchAlerts, setWatchAlerts] = useState<WatchAlert[]>([]);
    const [watchType, setWatchType] = useState<WatchAlert['type']>('DISEASE');
    const [watchTitle, setWatchTitle] = useState('');
    const [watchDetails, setWatchDetails] = useState('');
    const [watchLocation, setWatchLocation] = useState('');
    const [latText, setLatText] = useState('');
    const [lngText, setLngText] = useState('');
    const [mapLink, setMapLink] = useState('');

    React.useEffect(() => {
        getFarmContacts().then(setContacts).catch(() => setContacts([]));
        getContactSearchPreferences()
            .then((p) => {
                setPrefs(p);
                setZonesText(p.allowedZones.join(', '));
                setBlockedText(p.blockedFarZones.join(', '));
                if (p.farmCoordinates) {
                    setLatText(String(p.farmCoordinates.latitude));
                    setLngText(String(p.farmCoordinates.longitude));
                }
            })
            .catch(() => null);
        watchService.getAlerts('OPEN').then(setWatchAlerts).catch(() => setWatchAlerts([]));
    }, []);

    const ask = async () => {
        if (!question.trim()) return;
        setLoading(true);
        try {
            const res = await askHybridAssistant(question.trim());
            setAnswer(res);
        } catch {
            setAnswer({
                mode: 'offline',
                title: 'Erreur',
                text: "Impossible d'analyser la question pour le moment.",
                dataUsed: [],
            });
        } finally {
            setLoading(false);
        }
    };

    const askPrompt = async (prompt: string) => {
        setQuestion(prompt);
        setLoading(true);
        try {
            const res = await askHybridAssistant(prompt);
            setAnswer(res);
        } catch {
            setAnswer({
                mode: 'offline',
                title: 'Erreur',
                text: "Impossible d'analyser la question pour le moment.",
                dataUsed: [],
            });
        } finally {
            setLoading(false);
        }
    };

    const savePrefs = async () => {
        const payload: Partial<ContactSearchPreferences> = {
            farmBaseLocation: prefs?.farmBaseLocation || 'Manjakandriana',
            allowedZones: zonesText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            blockedFarZones: blockedText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            maxDistanceHintKm: prefs?.maxDistanceHintKm || 80,
            farmCoordinates: prefs?.farmCoordinates,
        };
        await saveContactSearchPreferences(payload);
        const updated = await getContactSearchPreferences();
        setPrefs(updated);
    };

    const useGpsForFarm = async () => {
        setGeoLoading(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                setAnswer({
                    mode: 'offline',
                    title: 'Permission GPS refusée',
                    text: 'Activez la localisation pour détecter automatiquement la ferme.',
                    dataUsed: [],
                });
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const geocode = await Location.reverseGeocodeAsync({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            });
            const locality = geocode[0]?.city || geocode[0]?.subregion || geocode[0]?.region || 'Ferme';
            const nextAllowed = new Set([
                ...zonesText.split(',').map((s) => s.trim()).filter(Boolean),
                locality,
            ]);
            setPrefs((p) => ({
                ...(p as ContactSearchPreferences),
                farmBaseLocation: locality,
                farmCoordinates: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                },
            }));
            setZonesText(Array.from(nextAllowed).join(', '));
            setLatText(String(pos.coords.latitude));
            setLngText(String(pos.coords.longitude));
        } finally {
            setGeoLoading(false);
        }
    };

    const applyManualCoordinates = () => {
        const lat = Number(latText);
        const lng = Number(lngText);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        setPrefs((p) => ({
            ...(p as ContactSearchPreferences),
            farmCoordinates: { latitude: lat, longitude: lng },
        }));
    };

    const applyMapLink = () => {
        const text = mapLink.trim();
        if (!text) return;
        const matchAt = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        const matchQ = text.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        const lat = Number((matchAt?.[1] ?? matchQ?.[1]) || '');
        const lng = Number((matchAt?.[2] ?? matchQ?.[2]) || '');
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        setLatText(String(lat));
        setLngText(String(lng));
        setPrefs((p) => ({
            ...(p as ContactSearchPreferences),
            farmCoordinates: { latitude: lat, longitude: lng },
        }));
    };

    const searchFarmPlace = async () => {
        const q = (prefs?.farmBaseLocation || '').trim();
        if (!q) return;
        const geo = await Location.geocodeAsync(q);
        if (!geo?.length) return;
        setPrefs((p) => ({
            ...(p as ContactSearchPreferences),
            farmCoordinates: {
                latitude: geo[0].latitude,
                longitude: geo[0].longitude,
            },
        }));
        setLatText(String(geo[0].latitude));
        setLngText(String(geo[0].longitude));
    };

    const addContact = async () => {
        if (!contactName.trim()) return;
        const item: FarmContact = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: contactType,
            name: contactName.trim(),
            phone: contactPhone.trim() || undefined,
            location: contactLocation.trim() || undefined,
            source: 'manual',
        };
        await upsertFarmContact(item);
        setContacts(await getFarmContacts());
        setContactName('');
        setContactPhone('');
        setContactLocation('');
    };

    const reportWatchAlert = async () => {
        if (!watchTitle.trim()) return;
        const res = await watchService.report({
            type: watchType,
            title: watchTitle.trim(),
            details: watchDetails.trim() || undefined,
            location: watchLocation.trim() || prefs?.farmBaseLocation,
            source: 'MANUAL',
        });
        setWatchTitle('');
        setWatchDetails('');
        setWatchLocation('');
        const list = await watchService.getAlerts('OPEN').catch(() => []);
        setWatchAlerts(list);
        if ((res as any)?.queued) {
            setAnswer({
                mode: 'offline',
                title: 'Alerte enregistrée hors ligne',
                text: 'L’alerte sera synchronisée automatiquement quand le réseau revient.',
                dataUsed: ['alerte locale'],
            });
        }
    };

    const acknowledgeAlert = async (id: number) => {
        await watchService.acknowledge(id);
        setWatchAlerts(await watchService.getAlerts('OPEN').catch(() => []));
    };

    const resolveAlert = async (id: number) => {
        await watchService.resolve(id);
        setWatchAlerts(await watchService.getAlerts('OPEN').catch(() => []));
    };

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[35px] mb-2.5">
                <Text className="text-secondary text-[28px] font-bold">Aide IA</Text>
                <Text className="text-white opacity-80 text-[14px]">
                    Mode hybride: hors ligne et enrichi en ligne
                </Text>
            </View>

            <View className="p-5 gap-4">
                <View className="bg-white rounded-[20px] p-4 shadow-md">
                    <Text className="text-primary font-bold mb-2">Votre question</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                        {quickPrompts.map((p) => (
                            <TouchableOpacity
                                key={p}
                                className="mr-2 px-3 py-2 rounded-full border border-primary/30 bg-primary/5"
                                onPress={() => askPrompt(p)}
                            >
                                <Text className="text-primary text-[11px] font-semibold">{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 min-h-[90px]"
                        value={question}
                        onChangeText={setQuestion}
                        multiline
                        placeholder="Ex: Quel poids fait Manolo et Mia ?"
                    />
                    <TouchableOpacity
                        className="bg-secondary p-3 rounded-xl items-center mt-3"
                        onPress={ask}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold">{loading ? 'Analyse...' : 'Demander'}</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white rounded-[20px] p-4 shadow-md">
                    <Text className="text-primary font-bold mb-2">Veille locale et alertes</Text>
                    <Text className="text-[11px] text-text opacity-60 mb-2">
                        Déclarez maladie, vol ou rupture. Vous pouvez aussi ouvrir une recherche web récente, puis valider ce que vous gardez.
                    </Text>
                    <View className="flex-row gap-2 mb-2">
                        {(['DISEASE', 'THEFT', 'SUPPLY', 'OTHER'] as WatchAlert['type'][]).map((t) => (
                            <TouchableOpacity
                                key={t}
                                className={`px-2 py-1 rounded-lg border ${watchType === t ? 'bg-primary border-primary' : 'border-border'}`}
                                onPress={() => setWatchType(t)}
                            >
                                <Text className={`text-[11px] ${watchType === t ? 'text-white' : 'text-text'}`}>
                                    {t === 'DISEASE' ? 'Maladie' : t === 'THEFT' ? 'Vol' : t === 'SUPPLY' ? 'Rupture' : 'Autre'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={watchTitle}
                        onChangeText={setWatchTitle}
                        placeholder="Titre alerte (ex: Suspicion PPA autour)"
                    />
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={watchDetails}
                        onChangeText={setWatchDetails}
                        multiline
                        placeholder="Détails constatés"
                    />
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={watchLocation}
                        onChangeText={setWatchLocation}
                        placeholder="Lieu (optionnel)"
                    />
                    <TouchableOpacity className="bg-danger p-3 rounded-xl items-center" onPress={reportWatchAlert}>
                        <Text className="text-white font-bold">Enregistrer alerte</Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                            className="flex-1 border border-primary p-2 rounded-lg items-center"
                            onPress={() => prefs && searchRecentDiseaseNews(prefs)}
                        >
                            <Text className="text-primary text-[12px]">Actu maladie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 border border-primary p-2 rounded-lg items-center"
                            onPress={() => prefs && searchRecentTheftNews(prefs)}
                        >
                            <Text className="text-primary text-[12px]">Actu vol</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="mt-3">
                        {watchAlerts.slice(0, 6).map((a) => (
                            <View key={a.id} className="border border-border rounded-xl p-2 mb-2">
                                <Text className="font-bold text-[12px] text-primary">
                                    {a.type === 'DISEASE' ? 'Maladie' : a.type === 'THEFT' ? 'Vol' : a.type === 'SUPPLY' ? 'Rupture' : 'Autre'} - {a.title}
                                </Text>
                                <Text className="text-[11px] text-text opacity-70">{a.location || '-'}</Text>
                                {!!a.details && <Text className="text-[11px] text-text">{a.details}</Text>}
                                <View className="flex-row gap-2 mt-2">
                                    <TouchableOpacity className="flex-1 border border-secondary p-1 rounded items-center" onPress={() => acknowledgeAlert(a.id)}>
                                        <Text className="text-[11px] text-secondary">Accuser</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="flex-1 border border-success p-1 rounded items-center" onPress={() => resolveAlert(a.id)}>
                                        <Text className="text-[11px] text-success">Résoudre</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View className="bg-white rounded-[20px] p-4 shadow-md">
                    <Text className="text-primary font-bold mb-2">Contacts urgence (hors ligne)</Text>
                    <Text className="text-[11px] text-text opacity-60 mb-2">
                        Zones utiles: vous pouvez garder Antananarivo même si la ferme est à Manjakandriana, et bloquer les villes trop loin.
                    </Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={prefs?.farmBaseLocation || ''}
                        onChangeText={(v) => setPrefs((p) => ({ ...(p as ContactSearchPreferences), farmBaseLocation: v }))}
                        placeholder="Base ferme (ex: Manjakandriana)"
                    />
                    <TouchableOpacity
                        className="border border-secondary p-2 rounded-lg items-center mb-2"
                        onPress={searchFarmPlace}
                    >
                        <Text className="text-secondary text-[12px] font-bold">Rechercher ce lieu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="border border-primary p-2 rounded-lg items-center mb-2"
                        onPress={useGpsForFarm}
                        disabled={geoLoading}
                    >
                        <Text className="text-primary text-[12px] font-bold">
                            {geoLoading ? 'Détection GPS...' : 'Utiliser GPS pour la ferme'}
                        </Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2 mb-2">
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={latText}
                            onChangeText={setLatText}
                            placeholder="Latitude"
                        />
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={lngText}
                            onChangeText={setLngText}
                            placeholder="Longitude"
                        />
                    </View>
                    <TouchableOpacity className="border border-primary p-2 rounded-lg items-center mb-2" onPress={applyManualCoordinates}>
                        <Text className="text-primary text-[12px] font-bold">Appliquer coordonnées</Text>
                    </TouchableOpacity>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={mapLink}
                        onChangeText={setMapLink}
                        placeholder="Coller lien Google Maps"
                    />
                    <TouchableOpacity className="border border-primary p-2 rounded-lg items-center mb-2" onPress={applyMapLink}>
                        <Text className="text-primary text-[12px] font-bold">Appliquer lien map</Text>
                    </TouchableOpacity>
                    {!!prefs?.farmCoordinates && (
                        <View className="rounded-xl overflow-hidden mb-2 border border-border">
                            <MapView
                                style={{ width: '100%', height: 220 }}
                                region={{
                                    latitude: prefs.farmCoordinates.latitude,
                                    longitude: prefs.farmCoordinates.longitude,
                                    latitudeDelta: 0.05,
                                    longitudeDelta: 0.05,
                                }}
                            >
                                <Marker
                                    coordinate={{
                                        latitude: prefs.farmCoordinates.latitude,
                                        longitude: prefs.farmCoordinates.longitude,
                                    }}
                                    draggable
                                    onDragEnd={(e) => {
                                        const latitude = e.nativeEvent.coordinate.latitude;
                                        const longitude = e.nativeEvent.coordinate.longitude;
                                        setPrefs((p) => ({
                                            ...(p as ContactSearchPreferences),
                                            farmCoordinates: { latitude, longitude },
                                        }));
                                        setLatText(String(latitude));
                                        setLngText(String(longitude));
                                    }}
                                />
                            </MapView>
                        </View>
                    )}
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={zonesText}
                        onChangeText={setZonesText}
                        placeholder="Zones autorisées (ex: Manjakandriana, Antananarivo)"
                    />
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={blockedText}
                        onChangeText={setBlockedText}
                        placeholder="Zones trop loin à bloquer (ex: Fianarantsoa, Tulear)"
                    />
                    <TouchableOpacity className="bg-secondary p-3 rounded-xl items-center mb-3" onPress={savePrefs}>
                        <Text className="text-white font-bold">Enregistrer zones</Text>
                    </TouchableOpacity>
                    {prefs?.farmCoordinates && (
                        <Text className="text-[11px] text-text opacity-60 mb-2">
                            GPS ferme: {prefs.farmCoordinates.latitude.toFixed(5)}, {prefs.farmCoordinates.longitude.toFixed(5)}
                        </Text>
                    )}

                    <View className="flex-row gap-2 mb-2">
                        <TouchableOpacity
                            className={`flex-1 p-2 rounded-lg border ${contactType === 'VET' ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => setContactType('VET')}
                        >
                            <Text className={`text-center text-[12px] font-bold ${contactType === 'VET' ? 'text-white' : 'text-text'}`}>
                                Vétérinaire
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-2 rounded-lg border ${contactType === 'FEED_SUPPLIER' ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => setContactType('FEED_SUPPLIER')}
                        >
                            <Text className={`text-center text-[12px] font-bold ${contactType === 'FEED_SUPPLIER' ? 'text-white' : 'text-text'}`}>
                                Alimentation
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={contactName}
                        onChangeText={setContactName}
                        placeholder="Nom"
                    />
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        placeholder="Téléphone"
                    />
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-2"
                        value={contactLocation}
                        onChangeText={setContactLocation}
                        placeholder="Localisation"
                    />
                    <TouchableOpacity className="bg-primary p-3 rounded-xl items-center" onPress={addContact}>
                        <Text className="text-white font-bold">Ajouter contact</Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                            className="flex-1 border border-primary p-2 rounded-lg items-center"
                            onPress={() => prefs && searchVetOnline(prefs)}
                        >
                            <Text className="text-primary text-[12px]">Chercher vet (web)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 border border-primary p-2 rounded-lg items-center"
                            onPress={() => prefs && searchFeedSupplierOnline(prefs)}
                        >
                            <Text className="text-primary text-[12px]">Chercher aliment (web)</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                            className="flex-1 border border-border p-2 rounded-lg items-center"
                            onPress={() => prefs && searchOnFacebook('vet', prefs)}
                        >
                            <Text className="text-text text-[12px]">Facebook vet</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 border border-border p-2 rounded-lg items-center"
                            onPress={() => prefs && searchOnFacebook('feed', prefs)}
                        >
                            <Text className="text-text text-[12px]">Facebook aliment</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="mt-3">
                        {contacts.slice(0, 6).map((c) => (
                            <Text key={c.id} className="text-[12px] text-text mb-1">
                                - {c.type === 'VET' ? 'Vet' : 'Aliment'}: {c.name}
                                {c.phone ? ` | ${c.phone}` : ''}
                                {c.location ? ` | ${c.location}` : ''}
                            </Text>
                        ))}
                    </View>
                </View>

                {loading && (
                    <View className="items-center py-4">
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                )}

                {answer && (
                    <View className="bg-white rounded-[20px] p-4 shadow-md mb-8">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-primary font-bold">{answer.title}</Text>
                            <Text className={`text-[11px] font-bold ${answer.mode === 'online' ? 'text-success' : 'text-secondary'}`}>
                                {answer.mode === 'online' ? 'Mode en ligne' : 'Mode hors ligne'}
                            </Text>
                        </View>
                        <Text className="text-text leading-6">{answer.text}</Text>
                        {answer.dataUsed.length > 0 && (
                            <Text className="text-[11px] text-text opacity-60 mt-3">
                                Sources: {answer.dataUsed.join(', ')}
                            </Text>
                        )}
                        <Text className="text-[11px] text-danger mt-3">
                            Aide probable uniquement, ne remplace pas un vétérinaire.
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

