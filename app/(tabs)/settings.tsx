import { useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MADAGASCAR_REGIONS } from '../../constants/breeds';
import { Colors } from '../../constants/theme';
import { SwipeTabScreen } from '../../components/navigation/swipe-tab-screen';
import { FeedRecipe, feedRecipeService, pigService, reportService } from '../../services/api';
import { getQueueLength } from '../../services/offlineQueue';
import { AppSettings, settingsService } from '../../services/settings';
import { checkServerReachable, syncAll } from '../../services/syncService';
import { formatDateOnly } from '../../utils/reproduction-dates';

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] || character);
}

export default function SettingsScreen() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [online, setOnline] = useState<boolean | null>(null);
    const [queueLength, setQueueLength] = useState(0);
    const [csvText, setCsvText] = useState('');
    const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
    const [reportStartDate, setReportStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [reportEndDate, setReportEndDate] = useState(() => new Date());
    const [reportDatePicker, setReportDatePicker] = useState<'start' | 'end' | null>(null);
    const [exportingReport, setExportingReport] = useState(false);

    const load = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const [s, reachable, queue, recipes] = await Promise.all([
                settingsService.get(),
                checkServerReachable(),
                getQueueLength(),
                feedRecipeService.getAll().catch(() => []),
            ]);
            setSettings(s);
            setOnline(reachable);
            setQueueLength(queue);
            setFeedRecipes(recipes);
        } catch (error) {
            console.error('Error loading settings:', error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { load(); }, []));

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const result = await settingsService.update(settings);
            if ((result as any)?.queued) alert('Hors ligne — paramètres sauvegardés localement.');
            else alert('Paramètres enregistrés !');
            queryClient.invalidateQueries();
            await load();
        } catch {
            alert('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const result = await syncAll(queryClient);
            if (!result.online) alert('Serveur inaccessible.');
            else if (result.synced > 0) {
                alert(`${result.synced} action(s) synchronisée(s) !`);
                queryClient.invalidateQueries();
            } else alert('Tout est à jour !');
            await load();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('La synchronisation a échoué. Vérifiez la connexion puis réessayez.');
        } finally {
            setSyncing(false);
        }
    };

    const handleImportCsv = async () => {
        if (!csvText.trim()) return alert('Collez du CSV d\'abord');
        const lines = csvText.trim().split('\n').slice(1);
        const pigs = lines.map((line) => {
            const [name, breed, gender, birthDate, purchasePrice, initialWeight] = line.split(',').map((s) => s.trim());
            return {
                name,
                breed: breed || 'Local (Gasy)',
                gender: (gender?.toUpperCase() === 'MALE' ? 'MALE' : 'FEMALE') as 'MALE' | 'FEMALE',
                birthDate: birthDate ? new Date(birthDate).toISOString() : new Date().toISOString(),
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
                initialWeight: initialWeight ? parseFloat(initialWeight) : undefined,
                isCastrated: false,
            };
        }).filter((p) => p.name);

        if (!pigs.length) return alert('Aucune ligne valide. Format: nom,race,MALE/FEMALE,date, prix, poids');

        try {
            const result = await pigService.importBulk(pigs);
            alert(`${result.imported} cochon(s) importé(s) !`);
            setCsvText('');
            queryClient.invalidateQueries();
        } catch {
            alert('Erreur import — vérifiez la connexion');
        }
    };

    const handleExport = async () => {
        setExportingReport(true);
        try {
            const startDate = formatDateOnly(reportStartDate);
            const endDate = formatDateOnly(reportEndDate);
            const report = await reportService.getMonthly(startDate, endDate);
            const pigs = report.pigs.map((pig: {
                name: string;
                breed: string;
                currentWeight: number | null;
                monthlyFeedKg: number;
                monthlyFeedCost: number;
            }) => `
                <tr>
                    <td>${escapeHtml(pig.name)}</td>
                    <td>${escapeHtml(pig.breed || 'Non renseignée')}</td>
                    <td>${pig.currentWeight == null ? '—' : `${pig.currentWeight} kg`}</td>
                    <td>${pig.monthlyFeedKg.toFixed(1)} kg</td>
                    <td>${Number(pig.monthlyFeedCost).toLocaleString('fr-FR')} Ar</td>
                </tr>
            `).join('');
            const generatedAt = new Date(report.generatedAt).toLocaleString('fr-FR');
            const html = `
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; color: #1b4332; padding: 28px; }
                        h1 { margin: 0 0 6px; color: #1b4332; }
                        .period { color: #666; margin-bottom: 24px; }
                        .summary { display: flex; gap: 12px; margin: 18px 0 26px; }
                        .card { flex: 1; background: #f1f6f2; border-radius: 8px; padding: 12px; }
                        .label { color: #666; font-size: 11px; }
                        .value { font-size: 18px; font-weight: bold; margin-top: 6px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
                        th { background: #1b4332; color: white; text-align: left; }
                        th, td { padding: 9px 7px; border: 1px solid #d9e2dc; }
                        tr:nth-child(even) { background: #f7f9f7; }
                        footer { margin-top: 28px; color: #777; font-size: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Rapport d'élevage</h1>
                    <div class="period">${escapeHtml(report.farmRegion || '')} · du ${new Date(`${report.startDate}T00:00:00`).toLocaleDateString('fr-FR')} au ${new Date(`${report.endDate}T00:00:00`).toLocaleDateString('fr-FR')}</div>
                    <div class="summary">
                        <div class="card"><div class="label">Cochons actifs</div><div class="value">${report.activePigs}</div></div>
                        <div class="card"><div class="label">En quarantaine</div><div class="value">${report.quarantinedPigs}</div></div>
                        <div class="card"><div class="label">Aliment sur la période</div><div class="value">${Number(report.totalFeedKg).toFixed(1)} kg</div></div>
                        <div class="card"><div class="label">Coût aliment</div><div class="value">${Number(report.totalFeedCost).toLocaleString('fr-FR')} Ar</div></div>
                    </div>
                    <h2>Détail des cochons actifs</h2>
                    <table>
                        <thead><tr><th>Nom</th><th>Race</th><th>Poids actuel</th><th>Aliment période</th><th>Coût période</th></tr></thead>
                        <tbody>${pigs || '<tr><td colspan="5">Aucun cochon actif</td></tr>'}</tbody>
                    </table>
                    <footer>Vaccins à faire : ${report.vaccinesDue} · Rapport généré le ${generatedAt}</footer>
                </body>
                </html>
            `;
            const { uri } = await Print.printToFileAsync({ html });
            if (!(await Sharing.isAvailableAsync())) {
                alert(`Le PDF a été créé, mais le partage n'est pas disponible sur cet appareil : ${uri}`);
                return;
            }
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Partager le rapport PDF',
                UTI: 'com.adobe.pdf',
            });
        } catch (error) {
            console.error('Report PDF export failed:', error);
            alert('Export PDF impossible. Vérifiez la connexion puis réessayez.');
        } finally {
            setExportingReport(false);
        }
    };

    if (loading) {
        return (
            <SwipeTabScreen tab="settings">
                <View className="flex-1 justify-center items-center bg-background">
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SwipeTabScreen>
        );
    }

    if (!settings) {
        return (
            <SwipeTabScreen tab="settings">
                <View className="flex-1 justify-center items-center bg-background px-8">
                    <Text className="text-center text-text">
                        {loadError ? 'Impossible de charger les réglages.' : 'Aucun réglage disponible.'}
                    </Text>
                    <TouchableOpacity className="bg-primary mt-5 px-6 py-3 rounded-xl" onPress={() => void load()}>
                        <Text className="text-white font-bold">Réessayer</Text>
                    </TouchableOpacity>
                </View>
            </SwipeTabScreen>
        );
    }

    const update = (key: keyof AppSettings, value: string | boolean) => {
        setSettings((s) => ({ ...s!, [key]: typeof value === 'boolean' ? value : Number(value) || value }));
    };

    return (
        <SwipeTabScreen tab="settings">
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[35px] mb-2.5">
                <Text className="text-secondary text-[28px] font-bold">Paramètres</Text>
                    <Text className="text-white opacity-80 text-[14px]">Prix, région, mode hors ligne</Text>
            </View>

            <View className="p-5 gap-5">
                {/* Sync */}
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className={`w-3 h-3 rounded-full ${online ? 'bg-success' : 'bg-danger'}`} />
                        <Text className="text-primary font-bold">{online ? 'En ligne' : 'Hors ligne'}</Text>
                    </View>
                    <Text className="text-[11px] text-text opacity-50 mb-3">
                        Fonctionne sans réseau. Sync automatique dès que la connexion revient.
                    </Text>
                    {queueLength > 0 && (
                        <Text className="text-secondary text-[13px] mb-3">{queueLength} action(s) en attente</Text>
                    )}
                    <View className="flex-row gap-3">
                        <TouchableOpacity className="flex-1 bg-primary p-3 rounded-xl items-center" onPress={handleSync} disabled={syncing}>
                            <Text className="text-white font-bold text-[12px]">{syncing ? '...' : 'Synchroniser'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-1 bg-secondary p-3 rounded-xl items-center" onPress={handleExport} disabled={exportingReport}>
                            <Text className="text-white font-bold text-[12px]">{exportingReport ? 'Création du PDF…' : 'Exporter en PDF'}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text className="text-[12px] text-text opacity-60 mt-5 mb-2">Période du rapport</Text>
                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl p-3"
                            onPress={() => setReportDatePicker('start')}
                        >
                            <Text className="text-[11px] text-text opacity-60">Du</Text>
                            <Text className="text-primary font-bold">{reportStartDate.toLocaleDateString('fr-FR')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 border border-border rounded-xl p-3"
                            onPress={() => setReportDatePicker('end')}
                        >
                            <Text className="text-[11px] text-text opacity-60">Au</Text>
                            <Text className="text-primary font-bold">{reportEndDate.toLocaleDateString('fr-FR')}</Text>
                        </TouchableOpacity>
                    </View>
                    {reportDatePicker && (
                        <DateTimePicker
                            value={reportDatePicker === 'start' ? reportStartDate : reportEndDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            maximumDate={reportDatePicker === 'start' ? reportEndDate : new Date()}
                            minimumDate={reportDatePicker === 'end' ? reportStartDate : undefined}
                            onChange={(_, selectedDate) => {
                                setReportDatePicker(null);
                                if (!selectedDate) return;
                                if (reportDatePicker === 'start') setReportStartDate(selectedDate);
                                else setReportEndDate(selectedDate);
                            }}
                        />
                    )}
                </View>

                {/* Region */}
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <Text className="text-primary font-bold mb-3">Région / marché</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                        {MADAGASCAR_REGIONS.map((r) => (
                            <TouchableOpacity
                                key={r}
                                className={`py-2 px-3 rounded-lg border mr-2 ${settings.farmRegion === r ? 'bg-primary border-primary' : 'border-border'}`}
                                onPress={() => setSettings((s) => ({ ...s!, farmRegion: r }))}
                            >
                                <Text className={`text-[12px] font-semibold ${settings.farmRegion === r ? 'text-white' : 'text-text'}`}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Text className="text-[12px] text-text opacity-60 mb-2">Cochon adulte vivant (Ar/kg)</Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-3"
                        value={String(settings.livePigSalePricePerKg)}
                        onChangeText={(v) => update('livePigSalePricePerKg', v)}
                        keyboardType="numeric"
                    />
                    <Text className="text-[12px] text-text opacity-60 mb-2">Carcasse / cochon mort (Ar/kg)</Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-3"
                        value={String(settings.carcassSalePricePerKg)}
                        onChangeText={(v) => update('carcassSalePricePerKg', v)}
                        keyboardType="numeric"
                    />
                    <Text className="text-[12px] text-text opacity-60 mb-2">Rendement carcasse (%)</Text>
                    <Text className="text-[11px] text-text opacity-50 mb-2">
                        Estimation poids vide = poids vif × ce % (défaut 72). Ajustez selon votre expérience.
                    </Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-4"
                        value={String(settings.carcassYieldPercent ?? 72)}
                        onChangeText={(v) => update('carcassYieldPercent', v)}
                        keyboardType="numeric"
                    />
                    <Text className="text-primary font-bold mb-2">Porcelet vivant — cours du marché (Ar/kg)</Text>
                    <Text className="text-[11px] text-text opacity-50 mb-3">
                        Le prix au kg est choisi selon l&apos;âge du porcelet. Modifiez ici selon le marché local.
                    </Text>
                    {[
                        { key: 'pigletLivePriceWeek1_4' as const, label: '0-4 semaines' },
                        { key: 'pigletLivePriceWeek5_8' as const, label: '5-8 semaines' },
                        { key: 'pigletLivePriceWeek9_12' as const, label: '9-12 semaines' },
                        { key: 'pigletLivePriceWeek13Plus' as const, label: '13+ semaines' },
                    ].map(({ key, label }) => (
                        <View key={key} className="flex-row items-center gap-3 mb-3">
                            <Text className="flex-1 text-[13px] text-text">{label}</Text>
                            <TextInput
                                className="w-24 bg-background border border-border rounded-xl p-2 text-center"
                                value={String(settings[key])}
                                onChangeText={(v) => update(key, v)}
                                keyboardType="numeric"
                            />
                        </View>
                    ))}
                </View>

                {/* Mélanges aliment maison */}
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <Text className="text-primary font-bold mb-2">Mélanges aliment (concentré + maïs…)</Text>
                    <Text className="text-[11px] text-text opacity-50 mb-3">
                        Activez un mélange pour calculer les coûts avec votre recette au lieu du prix provende seul.
                    </Text>
                    {feedRecipes.map((r) => (
                        <TouchableOpacity
                            key={r.id}
                            className={`p-3 rounded-xl border mb-2 ${r.isActive ? 'bg-primary/10 border-primary' : 'border-border'}`}
                            onPress={async () => {
                                await feedRecipeService.activate(r.id);
                                load();
                            }}
                        >
                            <Text className="font-bold text-text">{r.name}</Text>
                            <Text className="text-[12px] text-primary">{r.costPerKg.toLocaleString()} Ar/kg</Text>
                            {r.isActive && <Text className="text-[11px] text-success font-bold">Actif</Text>}
                        </TouchableOpacity>
                    ))}
                    {feedRecipes.length === 0 && (
                        <Text className="text-center opacity-40 text-[12px]">Mélange par défaut chargé au démarrage du serveur</Text>
                    )}
                </View>

                {/* Feed prices by phase */}
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <Text className="text-primary font-bold mb-3">Prix provende par phase (Ar/kg)</Text>
                    {[
                        { key: 'feedPriceStarter' as const, label: 'Démarrage (0-4 sem)' },
                        { key: 'feedPriceGrowth' as const, label: 'Croissance (5-12 sem)' },
                        { key: 'feedPriceFinish' as const, label: 'Finition (13+ sem)' },
                    ].map(({ key, label }) => (
                        <View key={key} className="flex-row items-center gap-3 mb-3">
                            <Text className="flex-1 text-[13px] text-text">{label}</Text>
                            <TextInput
                                className="w-24 bg-background border border-border rounded-xl p-2 text-center"
                                value={String(settings[key])}
                                onChangeText={(v) => update(key, v)}
                                keyboardType="numeric"
                            />
                        </View>
                    ))}
                </View>

                {/* Simple mode */}
                {/* <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <TouchableOpacity
                        className="flex-row justify-between items-center"
                        onPress={() => setSettings((s) => ({ ...s!, simpleFinanceMode: !s!.simpleFinanceMode }))}
                    >
                        <View className="flex-1 mr-4">
                            <Text className="text-primary font-bold">Mode finances simple</Text>
                            <Text className="text-[12px] text-text opacity-60">Masque les détails avancés sur la fiche cochon</Text>
                        </View>
                        <View className={`w-12 h-7 rounded-full justify-center ${settings.simpleFinanceMode ? 'bg-primary' : 'bg-border'}`}>
                            <View className={`w-5 h-5 rounded-full bg-white mx-1 ${settings.simpleFinanceMode ? 'self-end' : 'self-start'}`} />
                        </View>
                    </TouchableOpacity>
                </View> */}

                {/* CSV Import */}
                {/* <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10">
                    <Text className="text-primary font-bold mb-2">Import CSV (plusieurs cochons)</Text>
                    <Text className="text-[11px] text-text opacity-50 mb-3">
                        En-tête: nom,race,MALE/FEMALE,date(YYYY-MM-DD),prix,poids{'\n'}
                        Ex: Rakoto,Local (Gasy),MALE,2025-01-15,300000,8
                    </Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 min-h-[80px] text-[12px]"
                        value={csvText}
                        onChangeText={setCsvText}
                        multiline
                        placeholder="Collez vos lignes CSV ici..."
                    />
                    <TouchableOpacity className="bg-primary p-3 rounded-xl items-center mt-3" onPress={handleImportCsv}>
                        <Text className="text-white font-bold">Importer</Text>
                    </TouchableOpacity>
                </View> */}

                <TouchableOpacity className="bg-secondary p-4 rounded-xl items-center mb-8" onPress={handleSave} disabled={saving}>
                    <Text className="text-white font-bold">{saving ? 'Enregistrement...' : 'Enregistrer tous les paramètres'}</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
        </SwipeTabScreen>
    );
}
