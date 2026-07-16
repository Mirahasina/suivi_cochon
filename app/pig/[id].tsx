import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeightChart } from '@/components/WeightChart';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { Pig, pigService, Piglet, pigletService, healthService, VaccineSuggestion, VaccineType } from '../../services/api';
import { INJECTION_ROUTES, ANIMAL_TARGETS } from '../../constants/vaccines';
import { settingsService } from '../../services/settings';
import { RAISING_PURPOSE_LABELS, RaisingPurpose } from '../../constants/raising-purpose';
import {
    calculateSaleTotal,
    estimateCarcassKg,
    formatAgeLabel,
    getAgeInDays,
    MarketPrices,
    settingsToMarketPrices,
} from '../../utils/market-pricing';

export default function PigDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [pig, setPig] = useState<Pig | null>(null);
    const [loading, setLoading] = useState(true);
    const [newWeight, setNewWeight] = useState('');
    const [addingWeight, setAddingWeight] = useState(false);

    const [feedQty, setFeedQty] = useState('');
    const [feedCost, setFeedCost] = useState('');

    const [recordingVaccine, setRecordingVaccine] = useState(false);
    const [availableMales, setAvailableMales] = useState<Pig[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
    const [isExternal, setIsExternal] = useState(false);
    const [externalName, setExternalName] = useState('');
    const [vaccineSuggestions, setVaccineSuggestions] = useState<VaccineSuggestion[]>([]);
    const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [vaccineFilter, setVaccineFilter] = useState<'ALL' | 'PIGLET' | 'SOW' | 'BOAR'>('ALL');
    const [selectedVaccineTypeId, setSelectedVaccineTypeId] = useState<number | null>(null);
    const [saleWeightKg, setSaleWeightKg] = useState('');
    const [salePricePerKg, setSalePricePerKg] = useState('12000');
    const [saleType, setSaleType] = useState<'CARCASS_KG' | 'LIVE_KG'>('CARCASS_KG');
    const [marketPrices, setMarketPrices] = useState<MarketPrices | null>(null);
    const [carcassYieldPercent, setCarcassYieldPercent] = useState(72);

    const selectedVaccine = vaccineTypes.find((v) => v.id === selectedVaccineTypeId);

    const fetchPig = async () => {
        try {
            const data = await pigService.getOne(Number(id));
            setPig(data);
            setNewWeight(String(data.currentStatus?.currentWeight ?? data.currentStatus?.expectedWeight ?? ''));
            setFeedQty(String(data.currentStatus?.todayFeedKg ?? data.currentStatus?.recommendedFeed ?? ''));
            setFeedCost(String(data.currentStatus?.todayFeedCost ?? ''));

            try {
                const appSettings = await settingsService.get();
                const prices = settingsToMarketPrices(appSettings);
                setMarketPrices(prices);
                setCarcassYieldPercent(appSettings.carcassYieldPercent ?? 72);
                const weight = String(data.currentStatus?.currentWeight ?? data.currentStatus?.expectedWeight ?? '');
                setSaleWeightKg(weight);
                setSalePricePerKg(String(prices.carcassSalePricePerKg));
            } catch {
                // garde les valeurs par défaut
            }

            try {
                const [suggestions, types] = await Promise.all([
                    healthService.getSuggestedForPig(Number(id)),
                    healthService.getVaccineTypes(),
                ]);
                setVaccineSuggestions(suggestions);
                setVaccineTypes(types.filter((t) => t.isEnabled !== false));
            } catch {
                setVaccineSuggestions([]);
            }

            if (data.gender === 'FEMALE') {
                const allPigs = await pigService.getAll();
                setAvailableMales(allPigs.filter(p => p.gender === 'MALE'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPig();
    }, [id]);

    useEffect(() => {
        if (!marketPrices || !pig) return;
        const ageDays = getAgeInDays(pig.birthDate);
        const estimate = calculateSaleTotal(
            saleType,
            parseFloat(saleWeightKg) || 0,
            ageDays,
            marketPrices,
            false,
        );
        setSalePricePerKg(String(estimate.pricePerKg));
    }, [saleType, marketPrices, pig?.birthDate]);

    const handleAddWeight = async () => {
        if (!newWeight) return;
        setAddingWeight(true);
        try {
            const result = await pigService.addWeight(Number(id), parseFloat(newWeight));
            if ((result as any)?.queued) {
                alert('Hors ligne — correction en file d\'attente.');
            }
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
        } catch (error) {
            alert('Erreur');
        } finally {
            setAddingWeight(false);
        }
    };

    const handleAddFeeding = async () => {
        if (!feedQty || !feedCost) return;
        try {
            const result = await pigService.addFeeding(Number(id), parseFloat(feedQty), parseFloat(feedCost));
            if ((result as any)?.queued) {
                alert('Hors ligne — correction en file d\'attente.');
            }
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            setFeedQty('');
            setFeedCost('');
            fetchPig();
        } catch (error) {
            alert('Erreur lors de l\'enregistrement de l\'alimentation');
        }
    };

    const handleRecordMating = async () => {
        if (!isExternal && !selectedPartnerId) return alert('Veuillez choisir un partenaire');
        if (isExternal && !externalName) return alert('Veuillez saisir le nom du propriétaire');

        try {
            await pigService.recordMating(
                Number(id),
                isExternal ? undefined : selectedPartnerId!,
                undefined,
                isExternal,
                isExternal ? externalName : undefined
            );
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
        } catch (error) {
            alert('Erreur lors de l\'enregistrement de la saillie');
        }
    };

    const handleCastrate = async () => {
        try {
            await pigService.castrate(Number(id));
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
        } catch (error) {
            alert('Erreur');
        }
    };

    const handleRecordVaccine = async (vaccineTypeId: number, notes?: string) => {
        setRecordingVaccine(true);
        try {
            const result = await healthService.recordVaccination({
                pigId: Number(id),
                vaccineTypeId,
                date: new Date().toISOString(),
                notes: notes || 'Enregistré depuis la fiche',
            });
            if ((result as any)?.queued) {
                alert('Hors ligne — vaccin en file d\'attente, sera synchronisé plus tard.');
            }
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            setShowAddVaccine(false);
            setSelectedVaccineTypeId(null);
            fetchPig();
        } catch {
            alert('Erreur lors de l\'enregistrement du vaccin');
        } finally {
            setRecordingVaccine(false);
        }
    };

    const handleQuarantine = async () => {
        if (pig?.isQuarantined) {
            await pigService.setQuarantine(Number(id), false);
            fetchPig();
            return;
        }
        Alert.prompt(
            'Mise en quarantaine',
            'Raison (symptômes, suspicion PPA...):',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: async (reason?: string) => {
                        await pigService.setQuarantine(Number(id), true, reason || 'Suspicion sanitaire');
                        fetchPig();
                    },
                },
            ],
            'plain-text',
            '',
        );
    };

    const handleSetRaisingPurpose = async (purpose: RaisingPurpose) => {
        try {
            await pigService.setRaisingPurpose(Number(id), purpose);
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
        } catch {
            alert('Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async () => {
        try {
            await pigService.delete(Number(id));
            queryClient.invalidateQueries({ queryKey: ['pigs'] });

            // Push Notification
            import('../../utils/notifications').then(({ scheduleNotification }) => {
                scheduleNotification('Cochon supprimé', `Le cochon ${pig?.name} a été retiré du cheptel.`);
            });

            router.replace('/(tabs)');
        } catch (error) {
            alert('Erreur lors de la suppression');
        }
    };

    const handleSell = async () => {
        const liveWeight = parseFloat(saleWeightKg);
        const pricePerKg = parseFloat(salePricePerKg);
        if (!liveWeight || !pricePerKg) {
            return alert('Indiquez le poids (kg) et le prix au kg');
        }
        const billableWeight =
            saleType === 'CARCASS_KG' ? estimateCarcassKg(liveWeight, carcassYieldPercent) : liveWeight;
        const totalPrice = Math.round(billableWeight * pricePerKg);
        try {
            await pigService.sell(Number(id), {
                saleType,
                weightKg: saleType === 'CARCASS_KG' ? billableWeight : liveWeight,
                liveWeightKg: saleType === 'CARCASS_KG' ? liveWeight : undefined,
                pricePerKg,
                totalPrice,
            });
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
            import('../../utils/notifications').then(({ scheduleNotification }) => {
                scheduleNotification('Vente enregistrée', `${pig?.name} vendu — ${totalPrice.toLocaleString()} Ar`);
            });
        } catch {
            alert('Erreur lors de la vente');
        }
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.primary} className="flex-1 justify-center" />;
    if (!pig) return <View className="flex-1 bg-background items-center justify-center"><Text>Cochon non trouvé</Text></View>;

    const status = pig.currentStatus;
    const financials = pig.financials;
    const liveSaleKg = parseFloat(saleWeightKg) || 0;
    const estimatedCarcassKg =
        saleType === 'CARCASS_KG' ? estimateCarcassKg(liveSaleKg, carcassYieldPercent) : liveSaleKg;
    const saleTotal = Math.round(estimatedCarcassKg * (parseFloat(salePricePerKg) || 0));

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[40px]">
                <View className="flex-row justify-between items-start">
                    <View>
                        <Text className="text-secondary text-[34px] font-bold">{pig.name}</Text>
                        <Text className="text-white opacity-90 text-base">{pig.breed} • {pig.ageFormatted}</Text>
                    </View>
                    <View className="flex-row gap-4">
                        <TouchableOpacity onPress={() => router.push(`/pig/edit/${id}`)} className="p-2 bg-white/20 rounded-xl">
                            <IconSymbol name="pencil" size={22} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete} className="p-2 bg-white/20 rounded-xl">
                            <IconSymbol name="trash" size={22} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="flex-row gap-2.5 mt-4">
                    <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: pig.gender === 'MALE' ? '#1A75FF' : '#FF4D94' }}>
                        <Text className="text-white text-[12px] font-bold">{pig.gender === 'MALE' ? 'Verrat' : 'Truie'}</Text>
                    </View>
                    {pig.isCastrated && (
                        <View className="px-3 py-1.5 rounded-lg bg-success">
                            <Text className="text-white text-[12px] font-bold">Castré</Text>
                        </View>
                    )}
                </View>

                {/* Sexual Maturity Warning */}
                {!pig.isCastrated && pig.status === 'ACTIVE' && (
                    <View className="mt-4 bg-white/10 p-3 rounded-xl">
                        <Text className="text-white text-[12px] opacity-90">
                            {(() => {
                                const birthDate = new Date(pig.birthDate);
                                const maleMaturityWeeks = 24; // 6 months
                                const femaleMaturityWeeks = 28; // 7 months
                                const maturityWeeks = pig.gender === 'MALE' ? maleMaturityWeeks : femaleMaturityWeeks;
                                const maturityDate = new Date(birthDate);
                                maturityDate.setDate(birthDate.getDate() + (maturityWeeks * 7));

                                const now = new Date();
                                if (now >= maturityDate) {
                                    return `Prêt pour l'accouplement (Age: ${pig.ageFormatted})`;
                                } else {
                                    return `Maturité sexuelle prévue le ${maturityDate.toLocaleDateString()} (vers ${maturityWeeks} sem.)`;
                                }
                            })()}
                        </Text>
                    </View>
                )}
                {pig.isQuarantined && (
                    <View className="mt-4 bg-danger/90 p-3 rounded-xl">
                        <Text className="text-white font-bold">QUARANTAINE — {pig.quarantineReason || 'Suspicion sanitaire'}</Text>
                    </View>
                )}
            </View>

            {pig.status === 'ACTIVE' && (
                <View className="px-5 pt-3">
                    <TouchableOpacity
                        className={`p-3 rounded-xl items-center border-2 ${pig.isQuarantined ? 'border-success bg-success/10' : 'border-danger bg-danger/10'}`}
                        onPress={handleQuarantine}
                    >
                        <Text className={`font-bold ${pig.isQuarantined ? 'text-success' : 'text-danger'}`}>
                            {pig.isQuarantined ? 'Lever la quarantaine' : 'Mettre en quarantaine (PPA / maladie)'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Destination de l&apos;élevage</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4 mb-2">
                    <Text className="text-[12px] text-text opacity-70 mb-3">
                        À la naissance, tous les porcs sont « pas encore décidés ». Plus tard, on choisit
                        l&apos;engraissement (manatavy, pour la viande) ou la reproduction (truie / verrat).
                        Le poids et la ration s&apos;ajustent selon ce choix et le sexe.
                    </Text>
                    <Text className="text-primary font-bold mb-3">
                        Actuel : {status?.raisingPurposeLabel || RAISING_PURPOSE_LABELS.UNDECIDED}
                    </Text>
                    {pig.status === 'ACTIVE' && (
                        <View className="gap-2">
                            {(['UNDECIDED', 'FATTENING', 'BREEDING'] as RaisingPurpose[]).map((purpose) => (
                                <TouchableOpacity
                                    key={purpose}
                                    className={`p-3 rounded-xl border ${
                                        (status?.raisingPurpose || pig.raisingPurpose || 'UNDECIDED') === purpose
                                            ? 'bg-primary border-primary'
                                            : 'border-border'
                                    }`}
                                    onPress={() => handleSetRaisingPurpose(purpose)}
                                >
                                    <Text
                                        className={`font-bold text-[13px] ${
                                            (status?.raisingPurpose || pig.raisingPurpose || 'UNDECIDED') === purpose
                                                ? 'text-white'
                                                : 'text-text'
                                        }`}
                                    >
                                        {RAISING_PURPOSE_LABELS[purpose]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Performance & croissance ({pig.breed})</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    {pig.isPurchasedAfterBirth && (
                        <View className="bg-background p-3 rounded-xl mb-4">
                            <Text className="text-[12px] text-text opacity-80">
                                Cochon acheté — calcul depuis l&apos;achat :{' '}
                                {status?.purchaseWeight ?? pig.purchaseWeight ?? '?'} kg à l&apos;arrivée
                                {status?.weeksOnFarm != null ? `, ${status.weeksOnFarm} sem. à la ferme` : ''}.
                                {'\n'}Âge réel : {pig.ageFormatted} (vaccins et reproduction).
                            </Text>
                        </View>
                    )}
                    <View className="flex-row gap-5 mb-5">
                        <View className="flex-1 bg-background p-4 rounded-[15px] items-center">
                            <Text className="text-[12px] text-primary opacity-70">Poids norme</Text>
                            <Text className="text-primary text-xl font-bold">{status?.expectedWeight || '--'} kg</Text>
                        </View>
                        <View className="flex-1 bg-background p-4 rounded-[15px] items-center">
                            <Text className="text-[12px] text-primary opacity-70">Ration/jour</Text>
                            <Text className="text-primary text-xl font-bold">{status?.recommendedFeed || '--'} kg</Text>
                        </View>
                    </View>

                    {status?.isUnderweight ? (
                        <View className="bg-[#FFF0F0] p-3 rounded-xl mb-5">
                            <Text className="text-danger font-bold text-center">Croissance lente par rapport aux normes.</Text>
                        </View>
                    ) : (
                        <View className="bg-[#EFFFF4] p-3 rounded-xl mb-5">
                            <Text className="text-success font-bold text-center">Poids conforme aux normes {pig.breed} ({pig.ageFormatted}).</Text>
                        </View>
                    )}

                    <Text className="text-[12px] font-bold mb-2 text-primary">Évolution du poids</Text>
                    <WeightChart weights={pig.weightChart || []} norms={pig.normCurve} />

                    <View className="h-[1px] bg-border my-4" />

                    <Text className="text-[12px] font-bold mb-2 text-primary">
                        Poids actuel {status?.isWeightManual ? '(corrigé manuellement)' : '(automatique selon l\'âge)'}
                    </Text>
                    <View className="flex-row gap-2.5 items-center">
                        <TextInput
                            className={`bg-background rounded-xl p-3 flex-1 border border-border ${pig.status === 'SOLD' ? 'bg-[#F0F0F0] text-[#AAA]' : ''}`}
                            value={newWeight}
                            onChangeText={setNewWeight}
                            placeholder="Poids (kg)"
                            keyboardType="numeric"
                            editable={pig.status !== 'SOLD'}
                        />
                        <TouchableOpacity
                            className={`bg-primary p-3.5 rounded-xl min-w-[100px] items-center ${pig.status === 'SOLD' ? 'bg-[#CCC]' : ''}`}
                            onPress={handleAddWeight}
                            disabled={pig.status === 'SOLD' || addingWeight}
                        >
                            <Text className="text-white font-bold text-[12px]">{addingWeight ? '...' : 'Corriger'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View className="px-5 pt-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-primary text-xl font-semibold">Vaccinations</Text>
                    {pig.status === 'ACTIVE' && (
                        <TouchableOpacity
                            className="bg-secondary px-4 py-2 rounded-xl"
                            onPress={() => setShowAddVaccine(!showAddVaccine)}
                        >
                            <Text className="text-white font-bold text-[12px]">+ Ajouter</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {vaccineSuggestions.length > 0 && (
                    <View className="bg-[#FFF8E7] rounded-[20px] p-4 mb-4 border border-secondary/30">
                        <Text className="text-primary font-bold mb-2">Planning automatique</Text>
                        {vaccineSuggestions.map((s) => (
                            <View key={`${s.vaccineTypeId}-${s.dueAtDays}`} className="flex-row items-center py-2 border-b border-secondary/10">
                                <View className="flex-1">
                                    <Text className="font-semibold text-text">{s.vaccineName}</Text>
                                    <Text className="text-[11px] text-text opacity-60">{s.label}</Text>
                                    {s.injectionRouteLabel && (
                                        <Text className="text-[10px] text-primary mt-0.5">
                                            {s.injectionRouteLabel} — {s.injectionSite}
                                        </Text>
                                    )}
                                    <Text className={`text-[11px] font-bold mt-0.5 ${s.status === 'overdue' ? 'text-danger' : 'text-secondary'}`}>
                                        {s.status === 'overdue' ? 'En retard' : s.status === 'due' ? 'À faire maintenant' : 'Bientôt'} — prévu le {new Date(s.scheduledDate).toLocaleDateString()}
                                    </Text>
                                </View>
                                {pig.status === 'ACTIVE' && (
                                    <TouchableOpacity
                                        className="bg-primary px-3 py-2 rounded-lg ml-2"
                                        onPress={() => handleRecordVaccine(s.vaccineTypeId, `Planning: ${s.label}`)}
                                        disabled={recordingVaccine}
                                    >
                                        <Text className="text-white text-[11px] font-bold">Fait</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {showAddVaccine && pig.status === 'ACTIVE' && (
                    <View className="bg-white rounded-[20px] p-4 mb-4 shadow-md">
                        <Text className="text-primary font-bold mb-3">Choisir un vaccin</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                            {(['ALL', 'PIGLET', 'SOW', 'BOAR'] as const).map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    className={`py-1.5 px-3 rounded-lg border mr-2 ${vaccineFilter === f ? 'bg-secondary border-secondary' : 'border-border'}`}
                                    onPress={() => setVaccineFilter(f)}
                                >
                                    <Text className={`text-[11px] font-bold ${vaccineFilter === f ? 'text-white' : 'text-text'}`}>
                                        {f === 'ALL' ? 'Tous' : ANIMAL_TARGETS[f]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                            {vaccineTypes
                                .filter((vt) => vaccineFilter === 'ALL' || vt.target === vaccineFilter || vt.target === 'ALL')
                                .map((vt) => (
                                <TouchableOpacity
                                    key={vt.id}
                                    className={`py-2 px-3 rounded-lg border mr-2 ${selectedVaccineTypeId === vt.id ? 'bg-primary border-primary' : 'border-border bg-background'}`}
                                    onPress={() => setSelectedVaccineTypeId(vt.id)}
                                >
                                    <Text className={`text-[12px] font-semibold ${selectedVaccineTypeId === vt.id ? 'text-white' : 'text-text'}`}>
                                        {vt.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {selectedVaccine && (
                            <View className="bg-background p-3 rounded-xl mb-3">
                                <Text className="text-[12px] font-bold text-primary">{selectedVaccine.name}</Text>
                                <Text className="text-[11px] text-text opacity-70">{selectedVaccine.description}</Text>
                                <Text className="text-[11px] text-secondary mt-1">
                                    {INJECTION_ROUTES[selectedVaccine.injectionRoute] || selectedVaccine.injectionRoute}
                                </Text>
                                <Text className="text-[11px] text-text opacity-60">Site : {selectedVaccine.injectionSite}</Text>
                                <Text className="text-[11px] text-text opacity-60">Calendrier : {selectedVaccine.timingNote}</Text>
                                <Text className="text-[10px] text-primary opacity-50">Cible: {ANIMAL_TARGETS[selectedVaccine.target] || selectedVaccine.target}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            className={`bg-primary p-3 rounded-xl items-center ${!selectedVaccineTypeId ? 'opacity-50' : ''}`}
                            onPress={() => selectedVaccineTypeId && handleRecordVaccine(selectedVaccineTypeId)}
                            disabled={!selectedVaccineTypeId || recordingVaccine}
                        >
                            <Text className="text-white font-bold">Enregistrer le vaccin</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    {pig.vaccinations && pig.vaccinations.length > 0 ? (
                        [...pig.vaccinations]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((v) => (
                                <View key={v.id} className="flex-row items-center py-3 border-b border-border">
                                    <View className="w-10 h-10 bg-secondary/20 rounded-full items-center justify-center mr-3">
                                        <IconSymbol name="syringe.fill" size={18} color={Colors.secondary} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-text">{v.vaccineType.name}</Text>
                                        <Text className="text-[12px] text-text opacity-60">
                                            {new Date(v.date).toLocaleDateString()}
                                            {v.vaccineType && (v.vaccineType as VaccineType).injectionRoute
                                                ? ` • ${INJECTION_ROUTES[(v.vaccineType as VaccineType).injectionRoute] || ''}`
                                                : ''}
                                            {v.nextDueDate ? ` • Rappel: ${new Date(v.nextDueDate).toLocaleDateString()}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))
                    ) : (
                        <Text className="text-center text-text opacity-50 py-4">Aucun vaccin enregistré — le planning ci-dessus propose les prochains.</Text>
                    )}
                </View>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Finances (Ariary)</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    {financials?.liveSaleEstimate != null && (
                        <View className="bg-secondary/20 p-4 rounded-xl mb-4 items-center">
                            <Text className="text-[12px] text-primary opacity-70">Valeur estimée (vivant)</Text>
                            <Text className="text-primary text-2xl font-bold">{financials.liveSaleEstimate.toLocaleString()} Ar</Text>
                            <Text className="text-[11px] text-text opacity-50">
                                {status?.currentWeight} kg × {financials.livePigSalePricePerKg?.toLocaleString()} Ar/kg
                            </Text>
                        </View>
                    )}

                    <View className="flex-row justify-between mb-2.5">
                        <Text className="text-base text-text">Investissement Total</Text>
                        <Text className="text-base font-bold" style={{ color: Colors.gold }}>{financials?.totalInvestment?.toLocaleString()} Ar</Text>
                    </View>

                    {!financials?.simpleFinanceMode && (
                        <>
                    <View className="h-[1px] bg-border my-5" />

                    <Text className="text-[12px] font-bold mb-2.5 text-primary">Contrôle Alimentaire (Ce mois)</Text>
                    <View className="flex-row justify-center items-center my-2.5">
                        <View className="items-center flex-1">
                            <Text className="text-[12px] text-text opacity-60 mb-1">Réel</Text>
                            <Text className="text-xl font-bold" style={{ color: (financials?.actualMonthlyFeedKg || 0) > (financials?.theoreticalMonthlyFeedKg || 0) ? Colors.danger : Colors.success }}>
                                {financials?.actualMonthlyFeedKg?.toFixed(1)} kg
                            </Text>
                        </View>
                        <View className="w-[1px] h-10 bg-border mx-5" />
                        <View className="items-center flex-1">
                            <Text className="text-[12px] text-text opacity-60 mb-1">Théorique</Text>
                            <Text className="text-xl font-bold text-primary">{financials?.theoreticalMonthlyFeedKg?.toFixed(1)} kg</Text>
                        </View>
                    </View>

                    <View className="h-2 bg-[#EEE] rounded-full mt-4 overflow-hidden">
                        <View
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.min(((financials?.actualMonthlyFeedKg || 0) / (financials?.theoreticalMonthlyFeedKg || 1)) * 100, 100)}%`,
                                backgroundColor: (financials?.actualMonthlyFeedKg || 0) > (financials?.theoreticalMonthlyFeedKg || 0) ? Colors.danger : Colors.success
                            }}
                        />
                    </View>
                    <Text className="text-[12px] text-center mt-2 text-text opacity-70 italic">
                        {(financials?.actualMonthlyFeedKg || 0) > (financials?.theoreticalMonthlyFeedKg || 0)
                            ? "Suralimentation détectée"
                            : "Alimentation conforme (calculée automatiquement jour par jour)"}
                    </Text>

                    <View className="h-[1px] bg-border my-5" />

                    <Text className="text-[12px] font-bold mb-2.5 text-primary">
                        Alimentation aujourd&apos;hui {status?.isFeedManual ? '(corrigée)' : `(auto ${status?.feedPhase || ''}: ${status?.recommendedFeed} kg/j)`}
                    </Text>
                    <View className="flex-row gap-2.5 items-center">
                        <TextInput
                            className={`bg-background rounded-xl p-3 border border-border flex-[0.8] ${pig.status === 'SOLD' ? 'bg-[#F0F0F0] text-[#AAA]' : ''}`}
                            value={feedQty}
                            onChangeText={setFeedQty}
                            placeholder="kg"
                            keyboardType="numeric"
                            editable={pig.status !== 'SOLD'}
                        />
                        <TextInput
                            className={`bg-background rounded-xl p-3 border border-border flex-[1.5] ${pig.status === 'SOLD' ? 'bg-[#F0F0F0] text-[#AAA]' : ''}`}
                            value={feedCost}
                            onChangeText={setFeedCost}
                            placeholder="Coût (Ar)"
                            keyboardType="numeric"
                            editable={pig.status !== 'SOLD'}
                        />
                        <TouchableOpacity
                            className={`bg-primary p-3.5 rounded-xl min-w-[80px] items-center ${pig.status === 'SOLD' ? 'bg-[#CCC]' : ''}`}
                            onPress={handleAddFeeding}
                            disabled={pig.status === 'SOLD'}
                        >
                            <Text className="text-white font-bold text-[12px]">Corriger</Text>
                        </TouchableOpacity>
                    </View>
                        </>
                    )}

                    <View className="h-[1px] bg-border my-5" />

                    <Text className="text-[12px] font-bold mb-2.5 text-primary">Vente</Text>
                    <Text className="text-[11px] text-text opacity-50 mb-3">
                        Prix selon le cours du marché (modifiable dans Paramètres). Total = poids × prix/kg.
                    </Text>
                    <View className="flex-row gap-2 mb-3">
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-xl border items-center ${saleType === 'CARCASS_KG' ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => setSaleType('CARCASS_KG')}
                        >
                            <Text className={`font-bold text-[12px] ${saleType === 'CARCASS_KG' ? 'text-white' : 'text-primary'}`}>Cochon mort / kg</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-3 rounded-xl border items-center ${saleType === 'LIVE_KG' ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => setSaleType('LIVE_KG')}
                        >
                            <Text className={`font-bold text-[12px] ${saleType === 'LIVE_KG' ? 'text-white' : 'text-primary'}`}>Vivant / kg</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-2 mb-3">
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={saleWeightKg}
                            onChangeText={setSaleWeightKg}
                            placeholder={saleType === 'CARCASS_KG' ? 'Poids vif (kg)' : 'Poids vivant (kg)'}
                            keyboardType="numeric"
                        />
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={salePricePerKg}
                            onChangeText={setSalePricePerKg}
                            placeholder="Prix Ar/kg (marché)"
                            keyboardType="numeric"
                        />
                    </View>
                    {saleType === 'CARCASS_KG' && liveSaleKg > 0 && (
                        <View className="bg-background border border-border rounded-xl p-3 mb-3">
                            <Text className="text-[12px] text-text opacity-70">
                                Poids carcasse estimé ({carcassYieldPercent}% rendement)
                            </Text>
                            <Text className="text-primary font-bold text-base">
                                {estimatedCarcassKg.toFixed(1)} kg
                            </Text>
                            <Text className="text-[11px] text-text opacity-50 mt-1">
                                Ajustable dans Réglages — estimation faute de poids vide exact.
                            </Text>
                        </View>
                    )}
                    <View className="bg-primary p-4 rounded-xl items-center mb-3">
                        <Text className="text-white text-[12px] opacity-80">Total vente</Text>
                        <Text className="text-secondary text-xl font-bold">
                            {saleTotal.toLocaleString()} Ar
                        </Text>
                    </View>

                    {pig.status === 'ACTIVE' && (
                        <TouchableOpacity className="bg-secondary p-4 rounded-[15px] items-center" onPress={handleSell}>
                            <Text className="text-white font-bold">Enregistrer la Vente</Text>
                        </TouchableOpacity>
                    )}
                    {pig.status === 'SOLD' && (
                        <View className="bg-[#FFF9C4] p-4 rounded-[15px] items-center border border-gold">
                            <Text className="text-primary font-bold">
                                Vendu {pig.saleType === 'CARCASS_KG' ? 'mort' : 'vivant'}{' '}
                                {pig.saleWeightKg ? `${pig.saleWeightKg} kg × ${pig.salePricePerKg?.toLocaleString()} Ar/kg` : ''}
                            </Text>
                            {pig.saleLiveWeightKg != null && (
                                <Text className="text-primary text-[12px] opacity-70 mt-1">
                                    Poids vif : {pig.saleLiveWeightKg} kg
                                </Text>
                            )}
                            <Text className="text-primary font-bold">{pig.salePrice?.toLocaleString()} Ar</Text>
                        </View>
                    )}
                </View>
            </View>

            {
                pig.gender === 'FEMALE' && (
                    <View className="px-5 pt-6">
                        <Text className="text-primary text-xl font-semibold mb-4">Reproduction</Text>
                        <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                            {!pig.matingDate ? (
                                <View>
                                    <View className="flex-row gap-2.5 mb-4">
                                        <TouchableOpacity
                                            className={`flex-1 p-2.5 rounded-lg border items-center ${!isExternal ? 'bg-primary border-primary' : 'border-border'}`}
                                            onPress={() => setIsExternal(false)}
                                        >
                                            <Text className={`font-bold ${!isExternal ? 'text-white' : 'text-primary'}`}>Interne</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className={`flex-1 p-2.5 rounded-lg border items-center ${isExternal ? 'bg-primary border-primary' : 'border-border'}`}
                                            onPress={() => setIsExternal(true)}
                                        >
                                            <Text className={`font-bold ${isExternal ? 'text-white' : 'text-primary'}`}>Externe</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {!isExternal ? (
                                        <View>
                                            <Text className="text-[12px] font-bold mb-2.5 text-primary">Choisir un mâle de la ferme</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                                                {availableMales.map((m) => (
                                                    <TouchableOpacity
                                                        key={m.id}
                                                        className={`py-2 px-4 rounded-lg border mr-2.5 bg-white ${selectedPartnerId === m.id ? 'bg-primary border-primary' : 'border-border'}`}
                                                        onPress={() => setSelectedPartnerId(m.id)}
                                                    >
                                                        <Text className={`text-[12px] font-semibold ${selectedPartnerId === m.id ? 'text-white' : 'text-text'}`}>
                                                            {m.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                                {availableMales.length === 0 && <Text className="text-[#AAA]">Aucun mâle disponible</Text>}
                                            </ScrollView>
                                        </View>
                                    ) : (
                                        <View className="mb-4">
                                            <Text className="text-[12px] font-bold mb-2.5 text-primary">Nom du propriétaire du mâle</Text>
                                            <TextInput
                                                className="bg-background rounded-xl p-3 border border-border flex-1"
                                                value={externalName}
                                                onChangeText={setExternalName}
                                                placeholder="Ex: Rakoto"
                                            />
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        className={`bg-primary p-4 rounded-[15px] items-center ${((!isExternal && !selectedPartnerId) || (isExternal && !externalName)) ? 'bg-[#CCC]' : ''}`}
                                        onPress={handleRecordMating}
                                        disabled={(!isExternal && !selectedPartnerId) || (isExternal && !externalName)}
                                    >
                                        <Text className="text-white font-bold">Enregistrer la Saillie</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <View className="flex-row justify-between mb-2.5">
                                        <Text className="text-base">Date saillie</Text>
                                        <Text className="text-base font-bold">{new Date(pig.matingDate).toLocaleDateString()}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2.5">
                                        <Text className="text-base">Partenaire</Text>
                                        <Text className="text-base font-bold">{pig.partnerName || 'Inconnu'}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-2.5">
                                        <Text className="text-base">Mise bas prévue</Text>
                                        <Text className="text-base font-bold text-secondary">
                                            {pig.farrowingDate ? new Date(pig.farrowingDate).toLocaleDateString() : '--'}
                                        </Text>
                                    </View>

                                    {pig.matingDate && (
                                        <TouchableOpacity
                                            className="bg-secondary p-4 rounded-xl mt-4 items-center"
                                            onPress={() => router.push({
                                                pathname: '/farrowing/record',
                                                params: { pigId: id, pigName: pig.name }
                                            })}
                                        >
                                            <Text className="text-white font-bold">  Enregistrer Mise à Bas</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                )
            }

            {/* Piglets Section */}
            {pig.gender === 'FEMALE' && <PigletsSection pigId={Number(id)} />}


            {
                !pig.isCastrated && pig.gender === 'MALE' && (
                    <View className="px-5 pt-6">
                        <TouchableOpacity className="border-2 border-primary p-4 rounded-[15px] items-center" onPress={handleCastrate}>
                            <Text className="text-primary font-bold">Enregistrer la Castration</Text>
                        </TouchableOpacity>
                    </View>
                )
            }

            <View style={{ height: 60 }} />
        </ScrollView >
    );
}

// Piglets Section Component
function PigletsSection({ pigId }: { pigId: number }) {
    const queryClient = useQueryClient();
    const [piglets, setPiglets] = useState<Piglet[]>([]);
    const [loading, setLoading] = useState(true);
    const [marketPrices, setMarketPrices] = useState<MarketPrices | null>(null);
    const [sellingId, setSellingId] = useState<number | null>(null);
    const [saleMode, setSaleMode] = useState<'LIVE_KG' | 'CARCASS_KG'>('LIVE_KG');
    const [saleWeight, setSaleWeight] = useState('');
    const [salePriceKg, setSalePriceKg] = useState('');

    const fetchPiglets = async () => {
        try {
            const [data, appSettings] = await Promise.all([
                pigletService.getByMother(pigId),
                settingsService.get().catch(() => null),
            ]);
            setPiglets(data);
            if (appSettings) setMarketPrices(settingsToMarketPrices(appSettings));
        } catch (error) {
            console.error('Error fetching piglets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPiglets();
    }, [pigId]);

    const openSale = (piglet: Piglet, mode: 'LIVE_KG' | 'CARCASS_KG') => {
        if (!marketPrices) return;
        const ageDays = getAgeInDays(piglet.birthDate);
        const estimate = calculateSaleTotal(mode, 0, ageDays, marketPrices, true);
        setSellingId(piglet.id);
        setSaleMode(mode);
        setSaleWeight('');
        setSalePriceKg(String(estimate.pricePerKg));
    };

    const confirmSale = async () => {
        if (!sellingId) return;
        const weight = parseFloat(saleWeight);
        const pricePerKg = parseFloat(salePriceKg);
        if (!weight || !pricePerKg) return alert('Indiquez le poids et le prix au kg');
        try {
            await pigletService.sell(sellingId, {
                saleType: saleMode === 'LIVE_KG' ? 'LIVE_KG' : 'CARCASS_KG',
                weightKg: weight,
                pricePerKg,
            });
            queryClient.invalidateQueries({ queryKey: ['pig', pigId] });
            setSellingId(null);
            fetchPiglets();
        } catch {
            alert('Erreur lors de la vente');
        }
    };

    const handleMarkDead = async (pigletId: number) => {
        Alert.alert(
            'Confirmer',
            'Marquer ce porcelet comme mort ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    style: 'destructive',
                    onPress: async () => {
                        await pigletService.markDead(pigletId);
                        queryClient.invalidateQueries({ queryKey: ['pig', pigId] });
                        queryClient.invalidateQueries({ queryKey: ['pigs'] });
                        fetchPiglets();
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View className="px-5 pt-6">
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
        );
    }

    if (piglets.length === 0) {
        return null;
    }

    const alivePiglets = piglets.filter(p => p.status === 'ALIVE');
    const soldPiglets = piglets.filter(p => p.status === 'SOLD');
    const deadPiglets = piglets.filter(p => p.status === 'DEAD');
    const saleTotal = Math.round((parseFloat(saleWeight) || 0) * (parseFloat(salePriceKg) || 0));

    return (
        <View className="px-5 pt-6">
            <Text className="text-primary text-xl font-semibold mb-4">
                Porcelets ({piglets.length} total)
            </Text>
            <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-success/10 p-3 rounded-xl items-center">
                        <Text className="text-2xl font-bold text-success">{alivePiglets.length}</Text>
                        <Text className="text-xs text-gray-600">Vivants</Text>
                    </View>
                    <View className="flex-1 bg-gold/10 p-3 rounded-xl items-center">
                        <Text className="text-2xl font-bold" style={{ color: Colors.gold }}>{soldPiglets.length}</Text>
                        <Text className="text-xs text-gray-600">Vendus</Text>
                    </View>
                    <View className="flex-1 bg-danger/10 p-3 rounded-xl items-center">
                        <Text className="text-2xl font-bold text-danger">{deadPiglets.length}</Text>
                        <Text className="text-xs text-gray-600">Morts</Text>
                    </View>
                </View>

                {alivePiglets.map((piglet) => {
                    const ageDays = getAgeInDays(piglet.birthDate);
                    const isSelling = sellingId === piglet.id;

                    return (
                        <View key={piglet.id} className="border-t border-gray-200 pt-3 mt-3">
                            <View className="flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="font-semibold text-base">
                                        Porcelet #{piglet.id}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        Né le {new Date(piglet.birthDate).toLocaleDateString()} — {formatAgeLabel(ageDays)}
                                    </Text>
                                </View>
                                {!isSelling && (
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            className="bg-gold px-3 py-2 rounded-lg"
                                            onPress={() => openSale(piglet, 'LIVE_KG')}
                                        >
                                            <Text className="text-white text-xs font-bold">Vivant</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="bg-danger px-3 py-2 rounded-lg"
                                            onPress={() => handleMarkDead(piglet.id)}
                                        >
                                            <Text className="text-white text-xs font-bold">Mort</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {isSelling && (
                                <View className="mt-3 bg-background rounded-xl p-3 border border-border">
                                    <Text className="text-primary font-bold text-[12px] mb-2">
                                        Vente {saleMode === 'LIVE_KG' ? 'vivante' : 'carcasse'} — prix marché selon âge
                                    </Text>
                                    <View className="flex-row gap-2 mb-2">
                                        <TextInput
                                            className="flex-1 bg-white border border-border rounded-lg p-2 text-[13px]"
                                            value={saleWeight}
                                            onChangeText={setSaleWeight}
                                            placeholder="Poids (kg)"
                                            keyboardType="decimal-pad"
                                        />
                                        <TextInput
                                            className="flex-1 bg-white border border-border rounded-lg p-2 text-[13px]"
                                            value={salePriceKg}
                                            onChangeText={setSalePriceKg}
                                            placeholder="Ar/kg"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <Text className="text-center text-primary font-bold mb-2">
                                        Total : {saleTotal.toLocaleString()} Ar
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            className="flex-1 bg-secondary p-2 rounded-lg items-center"
                                            onPress={confirmSale}
                                        >
                                            <Text className="text-white font-bold text-[12px]">Confirmer</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="flex-1 border border-border p-2 rounded-lg items-center"
                                            onPress={() => setSellingId(null)}
                                        >
                                            <Text className="text-text text-[12px]">Annuler</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}

                {soldPiglets.length > 0 && (
                    <View className="border-t border-gray-200 pt-3 mt-4">
                        <Text className="text-[12px] font-bold text-primary mb-2">Vendus récemment</Text>
                        {soldPiglets.slice(0, 5).map((p) => (
                            <Text key={p.id} className="text-[11px] text-text opacity-70 mb-1">
                                #{p.id} — {p.saleType === 'LIVE_KG' || p.saleType === 'PIGLET_UNIT' ? 'vivant' : 'mort'}
                                {p.saleWeightKg ? ` ${p.saleWeightKg} kg × ${p.salePricePerKg?.toLocaleString()} Ar/kg` : ''}
                                {' '}= {p.salePrice?.toLocaleString()} Ar
                            </Text>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}
