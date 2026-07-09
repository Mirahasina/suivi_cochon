import React, { useState, useEffect } from 'react';
import { TextInput, TouchableOpacity, ScrollView, View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { pigService, healthService, Pig, batchService, Batch } from '../services/api';
import { PIG_BREEDS } from '../constants/breeds';
import { Colors, Typography } from '../constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

export default function AddPigScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [origin, setOrigin] = useState<'PURCHASED' | 'FARM_BORN'>('PURCHASED');
    const [name, setName] = useState('');
    const [breed, setBreed] = useState('Local (Gasy)');
    const [gender, setGender] = useState<'MALE' | 'FEMALE'>('FEMALE');
    const [birthDate, setBirthDate] = useState(new Date());
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
    const [showBirthPicker, setShowBirthPicker] = useState(false);
    const [showPurchasePicker, setShowPurchasePicker] = useState(false);
    const [purchasePrice, setPurchasePrice] = useState('');
    const [initialWeight, setInitialWeight] = useState('');
    const [motherId, setMotherId] = useState<number | null>(null);
    const [females, setFemales] = useState<Pig[]>([]);
    const [pigletCount, setPigletCount] = useState('1');
    const [loading, setLoading] = useState(false);
    const [vaccineTypes, setVaccineTypes] = useState<any[]>([]);
    const [selectedVaccines, setSelectedVaccines] = useState<number[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [batchId, setBatchId] = useState<number | null>(null);

    React.useEffect(() => {
        healthService.getVaccineTypes().then(setVaccineTypes);
        pigService.getAll().then(pigs => {
            setFemales(pigs.filter(p => p.gender === 'FEMALE'));
        });
        batchService.getAll().then(setBatches).catch(() => {});
    }, []);

    const breeds = [...PIG_BREEDS];

    const handleSubmit = async () => {
        if (!name && origin === 'PURCHASED') return alert('Le nom est requis');

        setLoading(true);
        try {
            const count = parseInt(pigletCount) || 1;
            for (let i = 0; i < count; i++) {
                const finalName = count > 1 ? `${name || 'Porcelet'} #${i + 1}` : name;

                const effectiveBirthDate = origin === 'FARM_BORN'
                    ? birthDate
                    : (purchaseDate || new Date());

                await pigService.create({
                    name: finalName,
                    breed,
                    gender,
                    birthDate: effectiveBirthDate.toISOString(),
                    purchaseDate: origin === 'PURCHASED' && purchaseDate ? purchaseDate.toISOString() : undefined,
                    purchasePrice: origin === 'PURCHASED' && purchasePrice ? parseFloat(purchasePrice) : undefined,
                    initialWeight: initialWeight ? parseFloat(initialWeight) : undefined,
                    isCastrated: false,
                    motherId: origin === 'FARM_BORN' ? motherId : undefined,
                    initialVaccineTypeIds: selectedVaccines,
                    batchId: batchId ?? undefined,
                } as any);
            }

            import('../utils/notifications').then(({ scheduleNotification }) => {
                scheduleNotification(
                    'Cochon ajouté',
                    count > 1 ? `${count} cochons ont été ajoutés.` : `Le cochon ${name} a été ajouté.`
                );
            });

            queryClient.invalidateQueries({ queryKey: ['pigs'] });

            router.back();
        } catch (error) {
            alert('Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 p-6 bg-background">
            <Text className="text-[28px] font-bold mb-8 text-primary">Ajouter un Cochon</Text>

            <View className="mb-8">
                <Text className="text-[12px] text-primary mb-3 font-bold opacity-70 uppercase tracking-wider">Provenance du cochon</Text>
                <View className="flex-row bg-white/50 p-1.5 rounded-2xl gap-2">
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-3.5 rounded-xl gap-2 ${origin === 'PURCHASED' ? 'bg-primary shadow-md' : ''}`}
                        onPress={() => setOrigin('PURCHASED')}
                    >
                        <IconSymbol name="paperplane.fill" size={18} color={origin === 'PURCHASED' ? '#D4AF37' : '#1B4332'} />
                        <Text className={`font-bold ${origin === 'PURCHASED' ? 'text-white' : 'text-primary'}`}>Acheté</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-3.5 rounded-xl gap-2 ${origin === 'FARM_BORN' ? 'bg-primary shadow-md' : ''}`}
                        onPress={() => setOrigin('FARM_BORN')}
                    >
                        <IconSymbol name="house" size={18} color={origin === 'FARM_BORN' ? '#D4AF37' : '#1B4332'} />
                        <Text className={`font-bold ${origin === 'FARM_BORN' ? 'text-white' : 'text-primary'}`}>Né à la ferme</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">
                    {origin === 'FARM_BORN' && parseInt(pigletCount) > 1 ? "Nom de base (Optionnel)" : "Nom ou Identifiant"}
                </Text>
                <TextInput
                    className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                    value={name}
                    onChangeText={setName}
                    placeholder={origin === 'FARM_BORN' ? "Ex: Portée A" : "Ex: Titine"}
                    placeholderTextColor="#AAA"
                />
            </View>

            {origin === 'FARM_BORN' && (
                <View className="flex-row gap-4 mb-5">
                    <View className="flex-1">
                        <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Nombre de porcelets</Text>
                        <TextInput
                            className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                            value={pigletCount}
                            onChangeText={setPigletCount}
                            keyboardType="numeric"
                        />
                    </View>
                    <View className="flex-[2]">
                        <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Mère</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                            {females.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    className={`py-2 px-4 rounded-xl border mr-2 ${motherId === m.id ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                                    onPress={() => setMotherId(m.id)}
                                >
                                    <Text className={`text-[12px] font-bold ${motherId === m.id ? 'text-white' : 'text-text'}`}>{m.name}</Text>
                                </TouchableOpacity>
                            ))}
                            {females.length === 0 && <Text className="text-[#AAA] italic py-2">Aucune truie trouvée</Text>}
                        </ScrollView>
                    </View>
                </View>
            )}

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Race du cochon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
                    {breeds.map((b) => (
                        <TouchableOpacity
                            key={b}
                            className={`py-2.5 px-5 rounded-xl border mr-2 ${breed === b ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                            onPress={() => setBreed(b)}
                        >
                            <Text className={`font-bold ${breed === b ? 'text-white' : 'text-text'}`}>{b}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {batches.length > 0 && (
                <View className="mb-5">
                    <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Lot (optionnel)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            className={`py-2 px-4 rounded-xl border mr-2 ${!batchId ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                            onPress={() => setBatchId(null)}
                        >
                            <Text className={`text-[12px] font-bold ${!batchId ? 'text-white' : 'text-text'}`}>Aucun</Text>
                        </TouchableOpacity>
                        {batches.filter(b => b.status === 'ACTIVE').map((b) => (
                            <TouchableOpacity
                                key={b.id}
                                className={`py-2 px-4 rounded-xl border mr-2 ${batchId === b.id ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                                onPress={() => setBatchId(b.id)}
                            >
                                <Text className={`text-[12px] font-bold ${batchId === b.id ? 'text-white' : 'text-text'}`}>{b.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

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

            <View className="flex-row gap-4 mb-5">
                {origin === 'FARM_BORN' ? (
                    <View className="flex-1">
                        <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Date de Naissance Nominale</Text>
                        <TouchableOpacity
                            className="bg-white border border-border rounded-[15px] p-4"
                            onPress={() => setShowBirthPicker(true)}
                        >
                            <Text className="text-base text-text">{birthDate.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        {showBirthPicker && (
                            <DateTimePicker
                                value={birthDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(e, d) => {
                                    setShowBirthPicker(false);
                                    if (d) setBirthDate(d);
                                }}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>
                ) : (
                    <View className="flex-1">
                        <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Date d'Achat</Text>
                        <TouchableOpacity
                            className="bg-white border border-border rounded-[15px] p-4"
                            onPress={() => setShowPurchasePicker(true)}
                        >
                            <Text className={`text-base ${purchaseDate ? 'text-text' : 'text-[#AAA]'}`}>
                                {purchaseDate ? purchaseDate.toLocaleDateString() : "Choisir"}
                            </Text>
                        </TouchableOpacity>
                        {showPurchasePicker && (
                            <DateTimePicker
                                value={purchaseDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(e, d) => {
                                    setShowPurchasePicker(false);
                                    if (d) setPurchaseDate(d);
                                }}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>
                )}
            </View>

            <View className="flex-row gap-4">
                <View className="flex-1 mb-5">
                    <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Poids {origin === 'FARM_BORN' ? 'de naissance' : 'Initial'} (kg)</Text>
                    <TextInput
                        className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                        value={initialWeight}
                        onChangeText={setInitialWeight}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#AAA"
                    />
                </View>

                {origin === 'PURCHASED' && (
                    <View className="flex-1 mb-5">
                        <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Prix d'Achat (Ar)</Text>
                        <TextInput
                            className="bg-white border border-border rounded-[15px] p-4 text-base text-text"
                            value={purchasePrice}
                            onChangeText={setPurchasePrice}
                            keyboardType="numeric"
                            placeholder="100000"
                            placeholderTextColor="#AAA"
                        />
                    </View>
                )}
            </View>

            <View className="mb-5">
                <Text className="text-[12px] text-primary mb-2 font-bold opacity-70">Soins et vaccins déjà réalisés (Fer, Vitamines, etc.)</Text>
                <View className="flex-row flex-wrap gap-2.5 mt-2">
                    {vaccineTypes.map((vt) => {
                        const isSelected = selectedVaccines.includes(vt.id);
                        return (
                            <TouchableOpacity
                                key={vt.id}
                                className={`py-2 px-[15px] rounded-full border ${isSelected ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                                onPress={() => {
                                    if (isSelected) {
                                        setSelectedVaccines(selectedVaccines.filter(id => id !== vt.id));
                                    } else {
                                        setSelectedVaccines([...selectedVaccines, vt.id]);
                                    }
                                }}
                            >
                                <Text className={`text-[13px] font-semibold ${isSelected ? 'text-white' : 'text-text'}`}>
                                    {vt.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <TouchableOpacity
                className={`bg-secondary p-[18px] rounded-[15px] items-center mt-8 mb-[60px] shadow-lg shadow-secondary/30 elevation-4 ${loading ? 'opacity-50' : ''}`}
                onPress={handleSubmit}
                disabled={loading}
            >
                <Text className="text-white text-lg font-bold">{loading ? 'Traitement...' : 'Ajouter le cochon'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
