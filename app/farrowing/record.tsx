import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pigletService } from '../../services/pigletApi';
import { formatDateOnly, parseDateOnly } from '../../utils/reproduction-dates';

export default function RecordFarrowingScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { pigId, pigName } = useLocalSearchParams<{ pigId: string; pigName: string }>();

    const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
    const [bornAlive, setBornAlive] = useState('');
    const [stillborn, setStillborn] = useState('0');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        const validCount = (value: string) => /^\d+$/.test(value);
        if (!validCount(bornAlive) || !validCount(stillborn)) {
            Alert.alert('Nombre invalide', 'Saisissez un nombre entier positif ou nul pour chaque catégorie.');
            return;
        }
        const aliveCount = Number(bornAlive);
        const stillbornCount = Number(stillborn);
        if (aliveCount + stillbornCount === 0) {
            Alert.alert('Portée vide', 'Indiquez au moins un porcelet né vivant ou mort-né.');
            return;
        }
        if (parseDateOnly(actualDate) > new Date()) {
            Alert.alert('Date invalide', 'La date de mise bas ne peut pas être dans le futur.');
            return;
        }

        setLoading(true);
        try {
            await pigletService.recordFarrowing({
                motherId: parseInt(pigId),
                actualDate: `${actualDate}T00:00:00.000Z`,
                bornAlive: aliveCount,
                stillborn: stillbornCount,
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
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Choisir la date effective de mise bas"
                        className="bg-white p-4 rounded-xl border border-gray-200"
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text>{parseDateOnly(actualDate).toLocaleDateString('fr-FR')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={parseDateOnly(actualDate)}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            maximumDate={new Date()}
                            onChange={(_, date) => {
                                setShowDatePicker(false);
                                if (date) setActualDate(formatDateOnly(date));
                            }}
                        />
                    )}
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
                        maxLength={3}
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
                        maxLength={3}
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
