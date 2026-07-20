import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { discoverAlerts, ProposedAlert } from '../../services/alertDiscovery';
import { watchService } from '../../services/api';
import { askHybridAssistant, ChatTurn } from '../../services/assistantHybrid';
import type { ProposedContact } from '../../services/contactDiscovery';
import {
    getContactSearchPreferences,
    getFarmContacts,
    saveContactSearchPreferences,
    upsertFarmContact,
} from '../../services/localStore';
import { checkServerReachable } from '../../services/syncService';
import type { ContactSearchPreferences, FarmContact, WatchAlert } from '../../services/types';

type Tab = 'chat' | 'alertes' | 'urgence';

const QUICK_PROMPTS = [
    'Poids de mes cochons',
    'Vaccins en retard',
    'Mon cochon est malade',
    'Maladie qui se propage autour',
    'Y a-t-il des alertes ?',
    'Cherche un vétérinaire',
    'Rupture aliment',
];

const TABS: { id: Tab; label: string }[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'alertes', label: 'Alertes' },
    { id: 'urgence', label: 'Urgence' },
];

interface ChatMessage extends ChatTurn {
    id: string;
    mode?: 'offline' | 'online';
    dataUsed?: string[];
    proposedContacts?: ProposedContact[];
    proposedAlerts?: ProposedAlert[];
}

export default function AssistantScreen() {
    const [tab, setTab] = useState<Tab>('chat');
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = React.useRef<ScrollView>(null);
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
    const [watchMessage, setWatchMessage] = useState('');
    const [latText, setLatText] = useState('');
    const [lngText, setLngText] = useState('');
    const [mapLink, setMapLink] = useState('');
    const [showLocFineTune, setShowLocFineTune] = useState(false);
    const [showZones, setShowZones] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [discoveredAlerts, setDiscoveredAlerts] = useState<ProposedAlert[]>([]);
    const [alertsLoading, setAlertsLoading] = useState(false);

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

    const refreshDiscoveredAlerts = React.useCallback(async () => {
        setAlertsLoading(true);
        try {
            const online = await checkServerReachable();
            const local = await watchService.getAlerts('OPEN').catch(() => []);
            const p = prefs || (await getContactSearchPreferences());
            const found = await discoverAlerts('ALL', p, local, online);
            setDiscoveredAlerts(found);
            setWatchAlerts(local);
        } finally {
            setAlertsLoading(false);
        }
    }, [prefs]);

    React.useEffect(() => {
        if (tab === 'alertes') refreshDiscoveredAlerts();
    }, [tab, refreshDiscoveredAlerts]);

    const pushAssistant = (
        text: string,
        mode?: 'offline' | 'online',
        dataUsed?: string[],
        proposedContacts?: ProposedContact[],
        proposedAlerts?: ProposedAlert[],
    ) => {
        setMessages((prev) => [
            ...prev,
            { id: `${Date.now()}-a`, role: 'assistant', text, mode, dataUsed, proposedContacts, proposedAlerts },
        ]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const runQuestion = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text: trimmed };
        const history = [...messages, userMsg].map(({ role, text: t }) => ({ role, text: t }));
        setMessages((prev) => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const res = await askHybridAssistant(trimmed, history);
            pushAssistant(res.text, res.mode, res.dataUsed, res.proposedContacts, res.proposedAlerts);
        } catch {
            pushAssistant("Désolé, je n'ai pas pu analyser votre question. Réessayez dans un instant.");
        } finally {
            setLoading(false);
        }
    };

    const ask = () => runQuestion(question);
    const askPrompt = (prompt: string) => runQuestion(prompt);

    const acceptProposal = async (messageId: string, proposal: ProposedContact) => {
        if (proposal.alreadySaved) return;
        await upsertFarmContact({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: proposal.type,
            name: proposal.name,
            phone: proposal.phone,
            location: proposal.location,
            source: 'web',
        });
        setContacts(await getFarmContacts());
        setMessages((prev) =>
            prev.map((m) =>
                m.id === messageId && m.proposedContacts
                    ? {
                          ...m,
                          proposedContacts: m.proposedContacts.map((p) =>
                              p.id === proposal.id ? { ...p, alreadySaved: true } : p,
                          ),
                      }
                    : m,
            ),
        );
    };

    const contactProposal = async (proposal: ProposedContact) => {
        if (proposal.contactUrl) {
            await Linking.openURL(proposal.contactUrl);
            return;
        }
        if (proposal.phone) {
            await Linking.openURL(`tel:${proposal.phone.replace(/\s/g, '')}`);
        }
    };

    const saveWebAlert = async (messageId: string, proposal: ProposedAlert) => {
        await watchService.report({
            type: proposal.type,
            title: proposal.title,
            details: proposal.details,
            location: proposal.location || prefs?.farmBaseLocation,
            source: 'WEB',
        });
        if (messageId !== 'tab') {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === messageId && m.proposedAlerts
                        ? {
                              ...m,
                              proposedAlerts: m.proposedAlerts.map((a) =>
                                  a.id === proposal.id ? { ...a, alreadySaved: true } : a,
                              ),
                          }
                        : m,
                ),
            );
        } else {
            setDiscoveredAlerts((prev) =>
                prev.map((a) => (a.id === proposal.id ? { ...a, alreadySaved: true } : a)),
            );
        }
        await refreshDiscoveredAlerts();
    };

    const openAlert = async (proposal: ProposedAlert) => {
        if (proposal.url) await Linking.openURL(proposal.url);
    };

    const savePrefs = async () => {
        const payload: Partial<ContactSearchPreferences> = {
            farmBaseLocation: prefs?.farmBaseLocation || 'Manjakandriana',
            allowedZones: zonesText.split(',').map((s) => s.trim()).filter(Boolean),
            blockedFarZones: blockedText.split(',').map((s) => s.trim()).filter(Boolean),
            maxDistanceHintKm: prefs?.maxDistanceHintKm || 80,
            farmCoordinates: prefs?.farmCoordinates,
        };
        await saveContactSearchPreferences(payload);
        setPrefs(await getContactSearchPreferences());
    };

    const useGpsForFarm = async () => {
        setGeoLoading(true);
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                setTab('chat');
                pushAssistant('Activez la localisation pour détecter automatiquement la ferme.');
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
                farmCoordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            }));
            setZonesText(Array.from(nextAllowed).join(', '));
            setLatText(String(pos.coords.latitude));
            setLngText(String(pos.coords.longitude));
            await saveContactSearchPreferences({
                farmBaseLocation: locality,
                allowedZones: Array.from(nextAllowed),
                blockedFarZones: blockedText.split(',').map((s) => s.trim()).filter(Boolean),
                maxDistanceHintKm: prefs?.maxDistanceHintKm || 80,
                farmCoordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            });
            setPrefs(await getContactSearchPreferences());
        } catch {
            Alert.alert('Erreur GPS', 'Impossible de détecter la position. Réessayez ou utilisez un lien Maps.');
        } finally {
            setGeoLoading(false);
        }
    };

    const applyMapLink = async () => {
        const text = mapLink.trim();
        if (!text) {
            Alert.alert('Lien manquant', 'Collez un lien Google Maps contenant les coordonnées.');
            return;
        }
        try {
            const matchAt = text.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            const matchQ = text.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            const matchLl = text.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            const matchPath = text.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            const lat = Number(matchAt?.[1] ?? matchQ?.[1] ?? matchLl?.[1] ?? matchPath?.[1] ?? '');
            const lng = Number(matchAt?.[2] ?? matchQ?.[2] ?? matchLl?.[2] ?? matchPath?.[2] ?? '');
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                Alert.alert(
                    'Lien non reconnu',
                    'Impossible de lire les coordonnées. Ouvrez Google Maps, partagez le lieu, puis collez le lien ici.',
                );
                return;
            }
            setLatText(String(lat));
            setLngText(String(lng));
            const next = {
                ...(prefs as ContactSearchPreferences),
                farmCoordinates: { latitude: lat, longitude: lng },
            };
            setPrefs(next);
            await saveContactSearchPreferences({
                farmBaseLocation: next.farmBaseLocation || 'Ferme',
                allowedZones: zonesText.split(',').map((s) => s.trim()).filter(Boolean),
                blockedFarZones: blockedText.split(',').map((s) => s.trim()).filter(Boolean),
                maxDistanceHintKm: next.maxDistanceHintKm || 80,
                farmCoordinates: { latitude: lat, longitude: lng },
            });
            Alert.alert('Position enregistrée', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
            Alert.alert('Erreur', 'Impossible d\'appliquer ce lien.');
        }
    };

    const searchFarmPlace = async () => {
        const q = (prefs?.farmBaseLocation || '').trim();
        if (!q) {
            Alert.alert('Lieu manquant', 'Indiquez d\'abord le nom du lieu (ex: Manjakandriana).');
            return;
        }
        setGeoLoading(true);
        try {
            const geo = await Location.geocodeAsync(q);
            if (!geo?.length) {
                Alert.alert('Introuvable', `Aucun résultat pour « ${q} ». Essayez un nom plus précis.`);
                return;
            }
            const { latitude, longitude } = geo[0];
            setPrefs((p) => ({
                ...(p as ContactSearchPreferences),
                farmCoordinates: { latitude, longitude },
            }));
            setLatText(String(latitude));
            setLngText(String(longitude));
            await saveContactSearchPreferences({
                farmBaseLocation: q,
                allowedZones: zonesText.split(',').map((s) => s.trim()).filter(Boolean),
                blockedFarZones: blockedText.split(',').map((s) => s.trim()).filter(Boolean),
                maxDistanceHintKm: prefs?.maxDistanceHintKm || 80,
                farmCoordinates: { latitude, longitude },
            });
            Alert.alert('Lieu trouvé', `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch {
            Alert.alert('Erreur', 'La recherche de lieu a échoué. Vérifiez le réseau ou utilisez le GPS.');
        } finally {
            setGeoLoading(false);
        }
    };

    const openFarmInMaps = async () => {
        const coords = prefs?.farmCoordinates;
        if (!coords) return;
        const url = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;
        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps.');
        }
    };

    const addContact = async () => {
        if (!contactName.trim()) return;
        await upsertFarmContact({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: contactType,
            name: contactName.trim(),
            phone: contactPhone.trim() || undefined,
            location: contactLocation.trim() || undefined,
            source: 'manual',
        });
        setContacts(await getFarmContacts());
        setContactName('');
        setContactPhone('');
        setContactLocation('');
        setShowAddContact(false);
    };

    const reportWatchAlert = async () => {
        const text = watchMessage.trim();
        if (!text) return;
        const lines = text.split('\n');
        const title = lines[0].trim();
        const details = lines.slice(1).join('\n').trim() || undefined;
        const res = await watchService.report({
            type: watchType,
            title,
            details,
            location: prefs?.farmBaseLocation,
            source: 'MANUAL',
        });
        setWatchMessage('');
        setWatchAlerts(await watchService.getAlerts('OPEN').catch(() => []));
        if ((res as { queued?: boolean })?.queued) {
            setTab('chat');
            pushAssistant("Alerte enregistrée hors ligne. Elle sera synchronisée dès que le réseau revient.");
        }
    };

    const acknowledgeAlert = async (id: number) => {
        await watchService.acknowledge(id);
        await refreshDiscoveredAlerts();
    };

    const resolveAlert = async (id: number) => {
        await watchService.resolve(id);
        await refreshDiscoveredAlerts();
    };

    const watchTypeLabel = (t: WatchAlert['type']) =>
        t === 'DISEASE' ? 'Maladie' : t === 'THEFT' ? 'Vol' : t === 'SUPPLY' ? 'Rupture' : 'Autre';

    const watchTypeColor = (t: WatchAlert['type']) =>
        t === 'DISEASE' ? 'bg-danger/10 text-danger' : t === 'THEFT' ? 'bg-secondary/10 text-secondary' : t === 'SUPPLY' ? 'bg-primary/10 text-primary' : 'bg-border text-text';

    const farmLabel = prefs?.farmBaseLocation || 'Non définie';
    const farmCoords = (() => {
        const c = prefs?.farmCoordinates;
        if (!c) return null;
        const latitude = Number(c.latitude);
        const longitude = Number(c.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
        return { latitude, longitude };
    })();
    const hasCoords = !!farmCoords;

    return (
        <View className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[35px]">
                <Text className="text-secondary text-[28px] font-bold">Aide IA</Text>
                <View className="flex-row mt-4 bg-white/15 rounded-xl p-1">
                    {TABS.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            className={`flex-1 py-2 rounded-lg items-center ${tab === t.id ? 'bg-white' : ''}`}
                            onPress={() => setTab(t.id)}
                        >
                            <Text className={`font-bold text-[13px] ${tab === t.id ? 'text-primary' : 'text-white'}`}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView ref={scrollRef} className="flex-1" keyboardShouldPersistTaps="handled">
                <View className="p-5 gap-4 pb-10">
                {tab === 'chat' && (
                    <>
                        {messages.length === 0 && (
                            <View className="bg-white/80 rounded-[20px] p-4 border border-border">
                                <Text className="text-text text-[13px] leading-5">
                                    Bonjour ! Posez une question en langage naturel, ou utilisez un raccourci ci-dessous.
                                </Text>
                            </View>
                        )}

                        {messages.map((m) => (
                            <View key={m.id} className={m.role === 'user' ? 'self-end max-w-[92%]' : 'self-start max-w-[92%]'}>
                                <View
                                    className={`rounded-[18px] p-3 ${
                                        m.role === 'user'
                                            ? 'bg-primary'
                                            : 'bg-white shadow-sm border border-border'
                                    }`}
                                >
                                    <Text className={`text-[14px] leading-6 ${m.role === 'user' ? 'text-white' : 'text-text'}`}>
                                        {m.text}
                                    </Text>
                                    {m.role === 'assistant' && m.mode && (
                                        <Text
                                            className={`text-[10px] mt-2 font-semibold ${m.mode === 'online' ? 'text-success' : 'text-secondary'}`}
                                        >
                                            {m.mode === 'online' ? 'En ligne' : 'Hors ligne'}
                                        </Text>
                                    )}
                                </View>
                                {m.role === 'assistant' && m.proposedContacts && m.proposedContacts.length > 0 && (
                                    <View className="mt-2 gap-2 w-full">
                                        {m.proposedContacts.map((p) => (
                                            <View key={p.id} className="bg-white border border-border rounded-xl p-3">
                                                <Text className="font-semibold text-[13px] text-text">{p.name}</Text>
                                                <Text className="text-[11px] text-text opacity-60 mt-0.5">
                                                    {p.type === 'VET' ? 'Vétérinaire' : 'Alimentation'}
                                                    {p.location ? ` · ${p.location}` : ''}
                                                    {p.phone ? ` · ${p.phone}` : ''}
                                                </Text>
                                                <View className="flex-row gap-2 mt-2">
                                                    <TouchableOpacity
                                                        className="flex-1 bg-primary p-2 rounded-lg items-center"
                                                        onPress={() => contactProposal(p)}
                                                    >
                                                        <Text className="text-white text-[11px] font-bold">
                                                            {p.phone ? 'Appeler' : 'Contacter'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {!p.alreadySaved ? (
                                                        <TouchableOpacity
                                                            className="flex-1 border border-secondary p-2 rounded-lg items-center"
                                                            onPress={() => acceptProposal(m.id, p)}
                                                        >
                                                            <Text className="text-secondary text-[11px] font-bold">Enregistrer</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <View className="flex-1 border border-success/30 bg-success/10 p-2 rounded-lg items-center justify-center">
                                                            <Text className="text-success text-[11px] font-bold">Enregistré</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {m.role === 'assistant' && m.proposedAlerts && m.proposedAlerts.length > 0 && (
                                    <View className="mt-2 gap-2 w-full">
                                        {m.proposedAlerts.map((a) => (
                                            <View key={a.id} className="bg-white border border-border rounded-xl p-3">
                                                <View className="flex-row items-center gap-2 mb-1">
                                                    <View className={`px-2 py-0.5 rounded ${watchTypeColor(a.type)}`}>
                                                        <Text className="text-[10px] font-bold">{watchTypeLabel(a.type)}</Text>
                                                    </View>
                                                    <Text className="text-[10px] text-text opacity-50">
                                                        {a.source === 'web' ? 'Actu web' : 'Locale'}
                                                    </Text>
                                                </View>
                                                <Text className="font-semibold text-[13px] text-text">{a.title}</Text>
                                                {!!a.details && (
                                                    <Text className="text-[11px] text-text opacity-60 mt-0.5" numberOfLines={3}>
                                                        {a.details}
                                                    </Text>
                                                )}
                                                <View className="flex-row gap-2 mt-2">
                                                    {a.source === 'web' ? (
                                                        <>
                                                            <TouchableOpacity
                                                                className="flex-1 bg-primary p-2 rounded-lg items-center"
                                                                onPress={() => openAlert(a)}
                                                            >
                                                                <Text className="text-white text-[11px] font-bold">Lire</Text>
                                                            </TouchableOpacity>
                                                            {!a.alreadySaved ? (
                                                                <TouchableOpacity
                                                                    className="flex-1 border border-secondary p-2 rounded-lg items-center"
                                                                    onPress={() => saveWebAlert(m.id, a)}
                                                                >
                                                                    <Text className="text-secondary text-[11px] font-bold">Enregistrer</Text>
                                                                </TouchableOpacity>
                                                            ) : (
                                                                <View className="flex-1 border border-success/30 bg-success/10 p-2 rounded-lg items-center">
                                                                    <Text className="text-success text-[11px] font-bold">Enregistré</Text>
                                                                </View>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TouchableOpacity
                                                                className="flex-1 border border-secondary p-2 rounded-lg items-center"
                                                                onPress={() => a.localId && acknowledgeAlert(a.localId)}
                                                            >
                                                                <Text className="text-secondary text-[11px] font-bold">Vu</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                className="flex-1 border border-success p-2 rounded-lg items-center"
                                                                onPress={() => a.localId && resolveAlert(a.localId)}
                                                            >
                                                                <Text className="text-success text-[11px] font-bold">Résolu</Text>
                                                            </TouchableOpacity>
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}

                        {loading && (
                            <View className="self-start bg-white rounded-[18px] p-3 border border-border flex-row items-center gap-2">
                                <ActivityIndicator color={Colors.primary} size="small" />
                                <Text className="text-text text-[13px] opacity-70">Je réfléchis…</Text>
                            </View>
                        )}

                        <View className="bg-white rounded-[20px] p-4 shadow-md mt-2">
                            <Text className="text-primary font-bold mb-2">Raccourcis</Text>
                            <View className="flex-row flex-wrap gap-2 mb-3">
                                {QUICK_PROMPTS.map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        className="px-3 py-2 rounded-full border border-primary/30 bg-primary/5"
                                        onPress={() => askPrompt(p)}
                                        disabled={loading}
                                    >
                                        <Text className="text-primary text-[11px] font-semibold">{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                className="bg-background border border-border rounded-xl p-3 min-h-[70px]"
                                value={question}
                                onChangeText={setQuestion}
                                multiline
                                placeholder="Ex: Manolo vomit depuis ce matin et ne mange plus"
                                onSubmitEditing={ask}
                            />
                            <TouchableOpacity
                                className="bg-secondary p-3 rounded-xl items-center mt-3"
                                onPress={ask}
                                disabled={loading || !question.trim()}
                            >
                                <Text className="text-white font-bold">{loading ? '…' : 'Envoyer'}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {tab === 'alertes' && (
                    <>
                        <View className="bg-white rounded-[20px] p-4 shadow-sm">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-primary font-bold">Veille automatique</Text>
                                <TouchableOpacity onPress={refreshDiscoveredAlerts} disabled={alertsLoading}>
                                    <Text className="text-secondary text-[12px] font-semibold">
                                        {alertsLoading ? 'Recherche…' : 'Actualiser'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <Text className="text-[11px] text-text opacity-50 mb-3">
                                Alertes locales + actualités web autour de {farmLabel}
                            </Text>
                            {alertsLoading ? (
                                <View className="py-6 items-center">
                                    <ActivityIndicator color={Colors.primary} />
                                </View>
                            ) : discoveredAlerts.length === 0 ? (
                                <Text className="text-[13px] text-text opacity-60">
                                    Aucune alerte trouvée. Demandez aussi dans le chat : « Y a-t-il des alertes ? »
                                </Text>
                            ) : (
                                <View className="gap-2">
                                    {discoveredAlerts.map((a) => (
                                        <View key={a.id} className="border border-border rounded-xl p-3">
                                            <View className="flex-row items-center gap-2 mb-1">
                                                <View className={`px-2 py-0.5 rounded ${watchTypeColor(a.type)}`}>
                                                    <Text className="text-[10px] font-bold">{watchTypeLabel(a.type)}</Text>
                                                </View>
                                                <Text className="text-[10px] text-text opacity-50">
                                                    {a.source === 'web' ? 'Actu web' : 'Locale'}
                                                </Text>
                                            </View>
                                            <Text className="font-semibold text-[13px] text-text">{a.title}</Text>
                                            {!!a.details && (
                                                <Text className="text-[11px] text-text opacity-60 mt-0.5" numberOfLines={2}>
                                                    {a.details}
                                                </Text>
                                            )}
                                            <View className="flex-row gap-2 mt-2">
                                                {a.source === 'web' ? (
                                                    <>
                                                        <TouchableOpacity
                                                            className="flex-1 bg-primary p-2 rounded-lg items-center"
                                                            onPress={() => openAlert(a)}
                                                        >
                                                            <Text className="text-white text-[11px] font-bold">Lire</Text>
                                                        </TouchableOpacity>
                                                        {!a.alreadySaved && (
                                                            <TouchableOpacity
                                                                className="flex-1 border border-secondary p-2 rounded-lg items-center"
                                                                onPress={() => saveWebAlert('tab', a)}
                                                            >
                                                                <Text className="text-secondary text-[11px] font-bold">Enregistrer</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <TouchableOpacity
                                                            className="flex-1 border border-secondary p-2 rounded-lg items-center"
                                                            onPress={() => a.localId && acknowledgeAlert(a.localId)}
                                                        >
                                                            <Text className="text-secondary text-[11px] font-bold">Vu</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            className="flex-1 border border-success p-2 rounded-lg items-center"
                                                            onPress={() => a.localId && resolveAlert(a.localId)}
                                                        >
                                                            <Text className="text-success text-[11px] font-bold">Résolu</Text>
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            className="bg-white rounded-[20px] p-4 shadow-sm"
                            onPress={() => setShowReportForm((v) => !v)}
                        >
                            <Text className="text-primary font-bold text-center">
                                {showReportForm ? 'Masquer le signalement' : '+ Signaler un problème (optionnel)'}
                            </Text>
                        </TouchableOpacity>

                        {showReportForm && (
                            <View className="bg-white rounded-[20px] p-4 shadow-sm gap-2">
                                <View className="flex-row flex-wrap gap-2">
                                    {(['DISEASE', 'THEFT', 'SUPPLY', 'OTHER'] as WatchAlert['type'][]).map((t) => (
                                        <TouchableOpacity
                                            key={t}
                                            className={`px-3 py-1.5 rounded-full ${watchType === t ? 'bg-primary' : 'bg-background border border-border'}`}
                                            onPress={() => setWatchType(t)}
                                        >
                                            <Text className={`text-[12px] font-semibold ${watchType === t ? 'text-white' : 'text-text'}`}>
                                                {watchTypeLabel(t)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    className="bg-background border border-border rounded-xl p-3 min-h-[80px] text-[14px]"
                                    value={watchMessage}
                                    onChangeText={setWatchMessage}
                                    multiline
                                    placeholder={'Qu\'est-ce qui se passe ?\n1ère ligne = titre, le reste = détails'}
                                />
                                <Text className="text-[10px] text-text opacity-50">Lieu : {farmLabel}</Text>
                                <TouchableOpacity
                                    className={`p-3 rounded-xl items-center ${watchMessage.trim() ? 'bg-danger' : 'bg-danger/40'}`}
                                    onPress={async () => {
                                        await reportWatchAlert();
                                        setShowReportForm(false);
                                        refreshDiscoveredAlerts();
                                    }}
                                    disabled={!watchMessage.trim()}
                                >
                                    <Text className="text-white font-bold">Envoyer le signalement</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}

                {tab === 'urgence' && (
                    <>
                        <View className="bg-white rounded-[20px] overflow-hidden shadow-sm">
                            {hasCoords && farmCoords ? (
                                <View className="bg-background px-4 py-5 gap-2">
                                    <Text className="text-primary font-bold text-[13px]">Position GPS enregistrée</Text>
                                    <Text className="text-text text-[12px] opacity-70">
                                        {farmCoords.latitude.toFixed(5)}, {farmCoords.longitude.toFixed(5)}
                                    </Text>
                                    <TouchableOpacity
                                        className="border border-primary p-2.5 rounded-xl items-center mt-1"
                                        onPress={openFarmInMaps}
                                    >
                                        <Text className="text-primary font-semibold text-[12px]">
                                            Voir dans Google Maps
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View className="h-[120px] bg-background items-center justify-center">
                                    <Text className="text-text opacity-40 text-[13px]">Carte non définie</Text>
                                </View>
                            )}
                            <View className="p-4">
                                <Text className="text-primary font-bold text-[15px]">{farmLabel}</Text>
                                <Text className="text-[11px] text-text opacity-50 mt-0.5">
                                    {hasCoords
                                        ? 'Affinez via GPS, recherche de lieu ou lien Maps'
                                        : 'Activez le GPS pour placer votre ferme'}
                                </Text>
                                <TouchableOpacity
                                    className="bg-primary p-3 rounded-xl items-center mt-3"
                                    onPress={useGpsForFarm}
                                    disabled={geoLoading}
                                >
                                    <Text className="text-white font-bold text-[13px]">
                                        {geoLoading ? 'Détection…' : 'Je suis à la ferme'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="mt-3 py-1"
                                    onPress={() => setShowLocFineTune((v) => !v)}
                                >
                                    <Text className="text-secondary text-[12px] font-semibold text-center">
                                        {showLocFineTune ? 'Masquer les options' : 'Affiner la position'}
                                    </Text>
                                </TouchableOpacity>
                                {showLocFineTune && (
                                    <View className="mt-2 gap-2">
                                        <TextInput
                                            className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                            value={prefs?.farmBaseLocation || ''}
                                            onChangeText={(v) => setPrefs((p) => ({ ...(p as ContactSearchPreferences), farmBaseLocation: v }))}
                                            placeholder="Nom du lieu"
                                        />
                                        <TouchableOpacity
                                            className="border border-border p-2 rounded-lg items-center"
                                            onPress={searchFarmPlace}
                                            disabled={geoLoading}
                                        >
                                            <Text className="text-text text-[12px]">Rechercher ce lieu</Text>
                                        </TouchableOpacity>
                                        <TextInput
                                            className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                            value={mapLink}
                                            onChangeText={setMapLink}
                                            placeholder="Lien Google Maps"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                        />
                                        <TouchableOpacity
                                            className="border border-border p-2 rounded-lg items-center"
                                            onPress={applyMapLink}
                                        >
                                            <Text className="text-text text-[12px]">Appliquer le lien</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <TouchableOpacity className="mt-2 py-1" onPress={() => setShowZones((v) => !v)}>
                                    <Text className="text-secondary text-[12px] font-semibold text-center">
                                        {showZones ? 'Masquer les zones' : 'Zones de recherche'}
                                    </Text>
                                </TouchableOpacity>
                                {showZones && (
                                    <View className="mt-2 gap-2">
                                        <TextInput
                                            className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                            value={zonesText}
                                            onChangeText={setZonesText}
                                            placeholder="Zones utiles (Manjakandriana, Antananarivo…)"
                                        />
                                        <TextInput
                                            className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                            value={blockedText}
                                            onChangeText={setBlockedText}
                                            placeholder="Trop loin (Fianarantsoa, Tulear…)"
                                        />
                                        <TouchableOpacity className="bg-secondary p-2.5 rounded-xl items-center" onPress={savePrefs}>
                                            <Text className="text-white font-bold text-[13px]">Enregistrer</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="bg-white rounded-[20px] p-4 shadow-sm">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-primary font-bold">Contacts</Text>
                                <TouchableOpacity onPress={() => setShowAddContact((v) => !v)}>
                                    <Text className="text-secondary text-[13px] font-semibold">
                                        {showAddContact ? 'Annuler' : '+ Ajouter'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {showAddContact && (
                                <View className="mb-3 gap-2 border-b border-border pb-3">
                                    <View className="flex-row gap-2">
                                        {(['VET', 'FEED_SUPPLIER'] as const).map((t) => (
                                            <TouchableOpacity
                                                key={t}
                                                className={`flex-1 py-1.5 rounded-lg ${contactType === t ? 'bg-primary' : 'bg-background border border-border'}`}
                                                onPress={() => setContactType(t)}
                                            >
                                                <Text className={`text-center text-[11px] font-bold ${contactType === t ? 'text-white' : 'text-text'}`}>
                                                    {t === 'VET' ? 'Vétérinaire' : 'Aliment'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TextInput
                                        className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                        value={contactName}
                                        onChangeText={setContactName}
                                        placeholder="Nom"
                                    />
                                    <TextInput
                                        className="bg-background border border-border rounded-xl p-3 text-[13px]"
                                        value={contactPhone}
                                        onChangeText={setContactPhone}
                                        placeholder="Téléphone (optionnel)"
                                        keyboardType="phone-pad"
                                    />
                                    <TouchableOpacity
                                        className={`p-2.5 rounded-xl items-center ${contactName.trim() ? 'bg-primary' : 'bg-primary/40'}`}
                                        onPress={addContact}
                                        disabled={!contactName.trim()}
                                    >
                                        <Text className="text-white font-bold text-[13px]">Enregistrer</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {contacts.length === 0 ? (
                                <Text className="text-[12px] text-text opacity-50">
                                    Aucun contact. Demandez dans le chat : « Cherche un vétérinaire ».
                                </Text>
                            ) : (
                                contacts.map((c) => (
                                    <View key={c.id} className="flex-row items-center py-2 border-b border-border/50">
                                        <View className="flex-1">
                                            <Text className="text-[13px] font-semibold text-text">{c.name}</Text>
                                            <Text className="text-[11px] text-text opacity-50">
                                                {c.type === 'VET' ? 'Vétérinaire' : 'Aliment'}
                                                {c.phone ? ` · ${c.phone}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
                </View>
            </ScrollView>
        </View>
    );
}
