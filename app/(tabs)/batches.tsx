import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/theme';
import { batchService, buildingService, Batch, Building } from '../../services/api';

export default function BatchesScreen() {
    const queryClient = useQueryClient();
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [newBuilding, setNewBuilding] = useState('');
    const [newBatch, setNewBatch] = useState('');
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);

    const load = async () => {
        try {
            const [b, bt] = await Promise.all([buildingService.getAll(), batchService.getAll()]);
            setBuildings(b);
            setBatches(bt);
        } catch {
            Alert.alert('Erreur', 'Impossible de charger les lots');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => { setLoading(true); load(); }, []));

    const addBuilding = async () => {
        if (!newBuilding.trim()) return;
        await buildingService.create({ name: newBuilding.trim() });
        setNewBuilding('');
        load();
    };

    const addBatch = async () => {
        if (!newBatch.trim()) return;
        await batchService.create({ name: newBatch.trim(), buildingId: selectedBuildingId ?? undefined });
        setNewBatch('');
        load();
        queryClient.invalidateQueries();
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[35px] mb-2.5">
                <Text className="text-secondary text-[28px] font-bold">Lots & Bâtiments</Text>
                <Text className="text-white opacity-80 text-[14px]">Organisez votre cheptel par enclos</Text>
            </View>

            <View className="p-5">
                <Text className="text-primary text-lg font-bold mb-3">Bâtiments</Text>
                <View className="bg-white rounded-[20px] p-4 mb-5 shadow-md">
                    {buildings.map((b) => (
                        <View key={b.id} className="flex-row justify-between py-2 border-b border-border">
                            <Text className="font-semibold">{b.name}</Text>
                            <Text className="text-[12px] text-text opacity-50">{b.batches?.length ?? 0} lot(s)</Text>
                        </View>
                    ))}
                    {buildings.length === 0 && <Text className="text-center opacity-40 py-2">Aucun bâtiment</Text>}
                    <View className="flex-row gap-2 mt-3">
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={newBuilding}
                            onChangeText={setNewBuilding}
                            placeholder="Nom du bâtiment"
                        />
                        <TouchableOpacity className="bg-primary px-4 rounded-xl justify-center" onPress={addBuilding}>
                            <Text className="text-white font-bold">+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text className="text-primary text-lg font-bold mb-3">Lots</Text>
                <View className="bg-white rounded-[20px] p-4 shadow-md">
                    {batches.map((batch) => (
                        <View key={batch.id} className="py-3 border-b border-border">
                            <Text className="font-bold text-text">{batch.name}</Text>
                            <Text className="text-[12px] text-text opacity-60">
                                {batch.building?.name ?? 'Sans bâtiment'} • {batch.pigs?.length ?? 0} cochon(s) • {batch.status}
                            </Text>
                        </View>
                    ))}
                    {batches.length === 0 && <Text className="text-center opacity-40 py-2">Aucun lot</Text>}

                    <Text className="text-[12px] text-primary mt-4 mb-2">Bâtiment (optionnel)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                        <TouchableOpacity
                            className={`py-2 px-3 rounded-lg border mr-2 ${!selectedBuildingId ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => setSelectedBuildingId(null)}
                        >
                            <Text className={`text-[12px] ${!selectedBuildingId ? 'text-white' : 'text-text'}`}>Aucun</Text>
                        </TouchableOpacity>
                        {buildings.map((b) => (
                            <TouchableOpacity
                                key={b.id}
                                className={`py-2 px-3 rounded-lg border mr-2 ${selectedBuildingId === b.id ? 'bg-primary border-primary' : 'border-border'}`}
                                onPress={() => setSelectedBuildingId(b.id)}
                            >
                                <Text className={`text-[12px] ${selectedBuildingId === b.id ? 'text-white' : 'text-text'}`}>{b.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View className="flex-row gap-2">
                        <TextInput
                            className="flex-1 bg-background border border-border rounded-xl p-3"
                            value={newBatch}
                            onChangeText={setNewBatch}
                            placeholder="Nom du lot (ex: Lot Janvier 2026)"
                        />
                        <TouchableOpacity className="bg-secondary px-4 rounded-xl justify-center" onPress={addBatch}>
                            <Text className="text-white font-bold">+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
