import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import api from '../../services/api';

interface BreedingStats {
    totalFemales: number;
    pregnant: number;
    upcomingFarrowings: {
        id: number;
        name: string;
        expectedDate: string;
        daysRemaining: number;
    }[];
    pigletStats: {
        alive: number;
        sold: number;
        dead: number;
        total: number;
    };
    avgPigletsPerLitter: number;
    survivalRate: number;
}

export default function BreedingDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<BreedingStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/pigs/breeding/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching breeding stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!stats) {
        return (
            <View className="flex-1 justify-center items-center bg-background">
                <Text className="text-gray-500">Aucune donnée disponible</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[40px]">
                <Text className="text-secondary text-[34px] font-bold">Reproduction</Text>
                <Text className="text-white opacity-90 text-base mt-1">Gestion de l'élevage</Text>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Vue d'ensemble</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1 bg-primary/10 p-4 rounded-xl items-center">
                            <Text className="text-3xl font-bold text-primary">{stats.totalFemales}</Text>
                            <Text className="text-xs text-gray-600">Truies</Text>
                        </View>
                        <View className="flex-1 bg-success/10 p-4 rounded-xl items-center">
                            <Text className="text-3xl font-bold text-success">{stats.pregnant}</Text>
                            <Text className="text-xs text-gray-600">Gestantes</Text>
                        </View>
                    </View>

                    <View className="flex-row gap-4">
                        <View className="flex-1 bg-secondary/10 p-4 rounded-xl items-center">
                            <Text className="text-2xl font-bold text-secondary">
                                {stats.avgPigletsPerLitter}
                            </Text>
                            <Text className="text-xs text-gray-600 text-center">Porcelets/Portée</Text>
                        </View>
                        <View className="flex-1 bg-gold/10 p-4 rounded-xl items-center">
                            <Text className="text-2xl font-bold" style={{ color: Colors.gold }}>
                                {stats.survivalRate}%
                            </Text>
                            <Text className="text-xs text-gray-600 text-center">Taux survie</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Porcelets</Text>
                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                    <View className="flex-row justify-around">
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-success">{stats.pigletStats.alive}</Text>
                            <Text className="text-xs text-gray-600 mt-1">Vivants</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold" style={{ color: Colors.gold }}>
                                {stats.pigletStats.sold}
                            </Text>
                            <Text className="text-xs text-gray-600 mt-1">Vendus</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-danger">{stats.pigletStats.dead}</Text>
                            <Text className="text-xs text-gray-600 mt-1">Morts</Text>
                        </View>
                    </View>
                </View>
            </View>

            {stats.upcomingFarrowings.length > 0 && (
                <View className="px-5 pt-6">
                    <Text className="text-primary text-xl font-semibold mb-4">
                        Mises à Bas à Venir
                    </Text>
                    <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                        {stats.upcomingFarrowings.map((farrowing) => (
                            <TouchableOpacity
                                key={farrowing.id}
                                className="border-b border-gray-200 py-4"
                                onPress={() => router.push(`/pig/${farrowing.id}`)}
                            >
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-1">
                                        <Text className="font-bold text-lg">{farrowing.name}</Text>
                                        <Text className="text-xs text-gray-500">
                                            Prévue le {new Date(farrowing.expectedDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View
                                        className="px-4 py-2 rounded-xl"
                                        style={{
                                            backgroundColor:
                                                farrowing.daysRemaining <= 7
                                                    ? Colors.danger
                                                    : farrowing.daysRemaining <= 14
                                                        ? Colors.gold
                                                        : Colors.success,
                                        }}
                                    >
                                        <Text className="text-white font-bold text-sm">
                                            J-{farrowing.daysRemaining}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}
