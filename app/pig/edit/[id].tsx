import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { pigService, healthService } from '../../../services/api';
import { Colors, Typography } from '../../../constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function EditPigScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [breed, setBreed] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
    const [birthDate, setBirthDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [initialWeight, setInitialWeight] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const breeds = ['Large White', 'Landrace', 'Piétrain', 'Local (Gasy)'];

    useEffect(() => {
        const fetchPig = async () => {
            try {
                const data = await pigService.getOne(Number(id));
                setName(data.name);
                setBreed(data.breed);
                setGender(data.gender);
                setBirthDate(new Date(data.birthDate));
                setPurchasePrice(data.purchasePrice?.toString() || '');
                setInitialWeight(data.initialWeight?.toString() || '');
                setStatus(data.status);
            } catch (error) {
                alert('Erreur chargement cochon');
            } finally {
                setLoading(false);
            }
        };
        fetchPig();
    }, [id]);

    const handleSubmit = async () => {
        if (!name) return alert('Le nom est requis');

        setSaving(true);
        try {
            await pigService.update(Number(id), {
                name,
                breed,
                gender,
                birthDate: birthDate.toISOString(),
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
                initialWeight: initialWeight ? parseFloat(initialWeight) : undefined,
                status: status as any
            });

            queryClient.invalidateQueries({ queryKey: ['pig', Number(id)] });
            queryClient.invalidateQueries({ queryKey: ['pigs'] });

            // Push Notification
            import('../../../utils/notifications').then(({ scheduleNotification }) => {
                scheduleNotification('Cochon modifié', `Les informations de ${name} ont été mises à jour.`);
            });

            router.back();
        } catch (error) {
            alert('Erreur lors de la modification');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" color={Colors.primary} className="flex-1 justify-center" />;

    return (
        <ScrollView className="flex-1 p-6 bg-background">
            <View className="flex-row items-center gap-4 mb-8">
                <TouchableOpacity onPress={() => router.back()}>
                    <IconSymbol name="chevron.left" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text className="text-primary text-2xl font-bold">Modifier Cochon</Text>
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Nom ou Identifiant</Text>
                <TextInput
                    className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Titine"
                    placeholderTextColor="#AAA"
                />
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Race du cochon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
                    {breeds.map((b) => (
                        <TouchableOpacity
                            key={b}
                            className={`py-2.5 px-5 rounded-xl border mr-2.5 ${breed === b ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                            onPress={() => setBreed(b)}
                        >
                            <Text className={`font-bold ${breed === b ? 'text-white' : 'text-text'}`}>{b}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Sexe</Text>
                <View className="flex-row gap-2.5">
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-[15px] border items-center ${gender === 'MALE' ? 'bg-[#1A75FF] border-[#1A75FF]' : 'bg-white border-border'}`}
                        onPress={() => setGender('MALE')}
                    >
                        <Text className={`font-bold ${gender === 'MALE' ? 'text-white' : 'text-text'}`}>Mâle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 py-3 rounded-[15px] border items-center ${gender === 'FEMALE' ? 'bg-[#FF4D94] border-[#FF4D94]' : 'bg-white border-border'}`}
                        onPress={() => setGender('FEMALE')}
                    >
                        <Text className={`font-bold ${gender === 'FEMALE' ? 'text-white' : 'text-text'}`}>Femelle</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Date de Naissance</Text>
                <TouchableOpacity className="bg-white border border-border rounded-[15px] p-4" onPress={() => setShowPicker(true)}>
                    <Text style={{ color: Colors.text }}>{birthDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showPicker && (
                    <DateTimePicker
                        value={birthDate}
                        mode="date"
                        display="default"
                        onChange={(e, d) => {
                            setShowPicker(false);
                            if (d) setBirthDate(d);
                        }}
                        maximumDate={new Date()}
                    />
                )}
            </View>

            <View className="flex-row gap-2.5">
                <View className="mb-5 flex-1">
                    <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Poids Initial (kg)</Text>
                    <TextInput
                        className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                        value={initialWeight}
                        onChangeText={setInitialWeight}
                        keyboardType="numeric"
                    />
                </View>
                <View className="mb-5 flex-1">
                    <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Prix Achat (Ar)</Text>
                    <TextInput
                        className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                        value={purchasePrice}
                        onChangeText={setPurchasePrice}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Statut</Text>
                <View className="flex-row gap-2.5">
                    {['ACTIVE', 'SOLD', 'DECEASED'].map((s) => (
                        <TouchableOpacity
                            key={s}
                            className={`px-3 py-2 rounded-lg border flex-1 items-center ${status === s ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                            onPress={() => setStatus(s)}
                        >
                            <Text className={`text-[13px] font-semibold ${status === s ? 'text-white' : 'text-text'}`}>
                                {s === 'ACTIVE' ? 'Actif' : s === 'SOLD' ? 'Vendu' : 'Décédé'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity
                className={`bg-secondary p-[18px] rounded-[15px] items-center mt-8 mb-[60px] ${saving ? 'opacity-50' : ''}`}
                onPress={handleSubmit}
                disabled={saving}
            >
                <Text className="text-white text-lg font-bold">{saving ? 'Traitement...' : 'Enregistrer les modifications'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

