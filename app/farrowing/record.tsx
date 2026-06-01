import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { pigletService } from '../../services/pigletApi';

export default function RecordFarrowingScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { pigId, pigName } = useLocalSearchParams<{ pigId: string; pigName: string }>();

    const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
    const [bornAlive, setBornAlive] = useState('');
    const [stillborn, setStillborn] = useState('0');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!bornAlive) {
            Alert.alert('Erreur', 'Veuillez saisir le nombre de porcelets nés vivants');
            return;
        }

        setLoading(true);
        try {
            await pigletService.recordFarrowing({
                motherId: parseInt(pigId),
                actualDate: new Date(actualDate).toISOString(),
                bornAlive: parseInt(bornAlive),
                stillborn: parseInt(stillborn || '0'),
            });

            queryClient.invalidateQueries({ queryKey: ['pig', Number(pigId)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });

            Alert.alert('Succès', `Mise à bas enregistrée ! ${bornAlive} porcelets créés.`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            Alert.alert('Erreur', 'Impossible d\'enregistrer la mise à bas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-6">
                <Text className="text-2xl font-bold text-primary mb-2">
                    Enregistrer Mise à Bas
                </Text>
                <Text className="text-gray-600 mb-6">Mère : {pigName}</Text>

                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Date effective</Text>
                    <TextInput
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        value={actualDate}
                        onChangeText={setActualDate}
                        placeholder="YYYY-MM-DD"
                    />
                </View>

                <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Porcelets nés vivants *
                    </Text>
                    <TextInput
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        value={bornAlive}
                        onChangeText={setBornAlive}
                        keyboardType="number-pad"
                        placeholder="0"
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">Mort-nés</Text>
                    <TextInput
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        value={stillborn}
                        onChangeText={setStillborn}
                        keyboardType="number-pad"
                        placeholder="0"
                    />
                </View>

                <TouchableOpacity
                    className={`p-4 rounded-xl items-center ${loading ? 'bg-gray-400' : 'bg-primary'}`}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text className="text-white font-bold text-lg">
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
