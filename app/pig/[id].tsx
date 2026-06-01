import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { Pig, pigService, Piglet, pigletService } from '../../services/api';

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

    const [targetProfit, setTargetProfit] = useState('50000');
    const [availableMales, setAvailableMales] = useState<Pig[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
    const [isExternal, setIsExternal] = useState(false);
    const [externalName, setExternalName] = useState('');

    const fetchPig = async () => {
        try {
            const data = await pigService.getOne(Number(id));
            setPig(data);

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

    const handleAddWeight = async () => {
        if (!newWeight) return;
        setAddingWeight(true);
        try {
            await pigService.addWeight(Number(id), parseFloat(newWeight));
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            setNewWeight('');
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
            await pigService.addFeeding(Number(id), parseFloat(feedQty), parseFloat(feedCost));
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

    const handleSell = async (price: number) => {
        try {
            await pigService.sell(Number(id), price);
            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            fetchPig();
            // Push Notification
            import('../../utils/notifications').then(({ scheduleNotification }) => {
                scheduleNotification('Cochon vendu', `Félicitations ! ${pig?.name} a été vendu pour ${price.toLocaleString()} Ar.`);
            });

        } catch (error) {
            alert('Erreur lors de la vente');
        }
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.primary} className="flex-1 justify-center" />;
    if (!pig) return <View className="flex-1 bg-background items-center justify-center"><Text>Cochon non trouvé</Text></View>;

    const status = pig.currentStatus;
    const financials = pig.financials;
    const suggestedPrice = (financials?.totalInvestment || 0) + parseFloat(targetProfit || '0');

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
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Performance & croissance</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    <View className="flex-row gap-5 mb-5">
                        <View className="flex-1 bg-background p-4 rounded-[15px] items-center">
                            <Text className="text-[12px] text-primary opacity-70">Attendu</Text>
                            <Text className="text-primary text-xl font-bold">{status?.expectedWeight || '--'} kg</Text>
                        </View>
                        <View className="flex-1 bg-background p-4 rounded-[15px] items-center">
                            <Text className="text-[12px] text-primary opacity-70">Ration</Text>
                            <Text className="text-primary text-xl font-bold">{status?.recommendedFeed || '--'} kg/j</Text>
                        </View>
                    </View>

                    {status?.isUnderweight ? (
                        <View className="bg-[#FFF0F0] p-3 rounded-xl mb-5">
                            <Text className="text-danger font-bold text-center">⚠️ croissance lente par rapport aux normes.</Text>
                        </View>
                    ) : (
                        <View className="bg-[#EFFFF4] p-3 rounded-xl mb-5">
                            <Text className="text-success font-bold text-center"> croissance optimale.</Text>
                        </View>
                    )}

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
                            className={`bg-primary p-3.5 rounded-xl min-w-[80px] items-center ${pig.status === 'SOLD' ? 'bg-[#CCC]' : ''}`}
                            onPress={handleAddWeight}
                            disabled={pig.status === 'SOLD'}
                        >
                            <Text className="text-white font-bold">Peser</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Finances (Ariary)</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    <View className="flex-row justify-between mb-2.5">
                        <Text className="text-base text-text">Investissement Total</Text>
                        <Text className="text-base font-bold" style={{ color: Colors.gold }}>{financials?.totalInvestment?.toLocaleString()} Ar</Text>
                    </View>

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
                            ? "Suralimentation détectée ⚠️"
                            : "Alimentation conforme ou sous-dosée "}
                    </Text>

                    <View className="h-[1px] bg-border my-5" />

                    <Text className="text-[12px] font-bold mb-2.5 text-primary">Ajouter Dépense Alimentaire</Text>
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
                            <Text className="text-white font-bold">OK</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="h-[1px] bg-border my-5" />

                    <Text className="text-[12px] font-bold mb-2.5 text-primary">Simulation de Vente</Text>
                    <View className="flex-row gap-2.5 items-center">
                        <Text className="flex-1">Profit voulu:</Text>
                        <TextInput
                            className="bg-background rounded-xl p-3 border border-border flex-1"
                            value={targetProfit}
                            onChangeText={setTargetProfit}
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="bg-primary p-5 rounded-[15px] mt-4 items-center">
                        <Text className="text-[12px] text-white opacity-80">Prix de vente suggéré</Text>
                        <Text className="text-secondary text-2xl font-bold mt-1">{suggestedPrice.toLocaleString()} Ar</Text>
                    </View>

                    {pig.status === 'ACTIVE' && (
                        <TouchableOpacity className="bg-secondary p-4 rounded-[15px] mt-4 items-center" onPress={() => handleSell(suggestedPrice)}>
                            <Text className="text-white font-bold">Enregistrer la Vente</Text>
                        </TouchableOpacity>
                    )}
                    {pig.status === 'SOLD' && (
                        <View className="bg-[#FFF9C4] p-4 rounded-[15px] mt-4 items-center border border-gold">
                            <Text className="text-primary font-bold">Vendu pour {pig.salePrice?.toLocaleString()} Ar</Text>
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

    const fetchPiglets = async () => {
        try {
            const data = await pigletService.getByMother(pigId);
            setPiglets(data);
        } catch (error) {
            console.error('Error fetching piglets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPiglets();
    }, [pigId]);

    const handleSell = async (pigletId: number) => {
        Alert.prompt(
            'Vendre Porcelet',
            'Prix de vente (Ariary):',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: async (price: string | undefined) => {
                        if (price) {
                            await pigletService.sell(pigletId, parseFloat(price));
                            queryClient.invalidateQueries({ queryKey: ['pig', pigId] });
                            queryClient.invalidateQueries({ queryKey: ['pigs'] });
                            fetchPiglets();
                        }
                    }
                }
            ],
            'plain-text',
            '',
            'number-pad'
        );
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

                {alivePiglets.map((piglet) => (
                    <View key={piglet.id} className="border-t border-gray-200 pt-3 mt-3">
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="font-semibold text-base">
                                    Porcelet #{piglet.id}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                    Né le {new Date(piglet.birthDate).toLocaleDateString()}
                                </Text>
                            </View>
                            <View className="flex-row gap-2">
                                <TouchableOpacity
                                    className="bg-gold px-4 py-2 rounded-lg"
                                    onPress={() => handleSell(piglet.id)}
                                >
                                    <Text className="text-white text-xs font-bold">💰 Vendre</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="bg-danger px-4 py-2 rounded-lg"
                                    onPress={() => handleMarkDead(piglet.id)}
                                >
                                    <Text className="text-white text-xs font-bold">☠️ Mort</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
