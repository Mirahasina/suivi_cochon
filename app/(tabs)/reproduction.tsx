import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/theme';
import api, { expenseService, financeService, ExpenseCategory, FinanceSummary } from '../../services/api';

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

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string }[] = [
    { key: 'VET', label: 'Vétérinaire' },
    { key: 'TRANSPORT', label: 'Transport' },
    { key: 'LABOR', label: 'Main-d\'œuvre' },
    { key: 'MEDS', label: 'Médicaments' },
    { key: 'EQUIPMENT', label: 'Équipement' },
    { key: 'OTHER', label: 'Autre' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c.key, c.label]),
);

function formatAr(n: number) {
    return Math.round(n).toLocaleString('fr-FR');
}

export default function BreedingDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<BreedingStats | null>(null);
    const [finance, setFinance] = useState<FinanceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [periodAll, setPeriodAll] = useState(false);
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('OTHER');
    const [expenseNote, setExpenseNote] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [breedingRes, financeData] = await Promise.all([
                api.get('/pigs/breeding/stats'),
                periodAll
                    ? financeService.getSummary()
                    : financeService.getSummary(month, year),
            ]);
            setStats(breedingRes.data);
            setFinance(financeData);
        } catch (error) {
            console.error('Error loading reproduction/finance:', error);
        } finally {
            setLoading(false);
        }
    }, [month, year, periodAll]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const handleAddExpense = async () => {
        const amount = parseFloat(expenseAmount);
        if (!amount || amount <= 0) {
            return Alert.alert('Montant requis', 'Indiquez un montant en Ariary.');
        }
        setSavingExpense(true);
        try {
            await expenseService.create({
                amountAriary: amount,
                category: expenseCategory,
                note: expenseNote.trim() || undefined,
            });
            setExpenseAmount('');
            setExpenseNote('');
            await load();
        } catch {
            Alert.alert('Erreur', 'Impossible d\'enregistrer la dépense.');
        } finally {
            setSavingExpense(false);
        }
    };

    const handleDeleteExpense = (id: number) => {
        Alert.alert('Supprimer', 'Supprimer cette dépense ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await expenseService.delete(id);
                        await load();
                    } catch {
                        Alert.alert('Erreur', 'Suppression impossible.');
                    }
                },
            },
        ]);
    };

    const shiftMonth = (delta: number) => {
        setPeriodAll(false);
        let m = month + delta;
        let y = year;
        if (m < 1) {
            m = 12;
            y -= 1;
        } else if (m > 12) {
            m = 1;
            y += 1;
        }
        setMonth(m);
        setYear(y);
    };

    if (loading && !stats) {
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

    const profit = finance?.profit ?? 0;
    const profitColor = profit >= 0 ? Colors.success : Colors.danger;

    return (
        <ScrollView className="flex-1 bg-background">
            <View className="p-8 bg-primary rounded-b-[40px]">
                <Text className="text-secondary text-[34px] font-bold">Reproduction</Text>
                <Text className="text-white opacity-90 text-base mt-1">Gestion de l&apos;élevage</Text>
            </View>

            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Vue d&apos;ensemble</Text>
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

            {/* Finances */}
            <View className="px-5 pt-6">
                <Text className="text-primary text-xl font-semibold mb-4">Finances</Text>

                <View className="flex-row items-center justify-between mb-3">
                    <TouchableOpacity
                        className="px-3 py-2 rounded-xl bg-white border border-border"
                        onPress={() => shiftMonth(-1)}
                    >
                        <Text className="text-primary font-bold">‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPeriodAll(false)}>
                        <Text className="text-primary font-bold text-base">
                            {periodAll ? 'Tout' : `${String(month).padStart(2, '0')}/${year}`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="px-3 py-2 rounded-xl bg-white border border-border"
                        onPress={() => shiftMonth(1)}
                    >
                        <Text className="text-primary font-bold">›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`px-3 py-2 rounded-xl border ${periodAll ? 'bg-primary border-primary' : 'bg-white border-border'}`}
                        onPress={() => setPeriodAll(true)}
                    >
                        <Text className={`text-[12px] font-bold ${periodAll ? 'text-white' : 'text-primary'}`}>
                            Tout
                        </Text>
                    </TouchableOpacity>
                </View>

                {finance ? (
                    <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4 mb-4">
                        <View className="flex-row gap-3 mb-4">
                            <View className="flex-1 bg-success/10 p-3 rounded-xl items-center">
                                <Text className="text-[11px] text-gray-600">Recettes</Text>
                                <Text className="text-lg font-bold text-success">{formatAr(finance.revenue)}</Text>
                            </View>
                            <View className="flex-1 bg-danger/10 p-3 rounded-xl items-center">
                                <Text className="text-[11px] text-gray-600">Coûts</Text>
                                <Text className="text-lg font-bold text-danger">{formatAr(finance.totalCost)}</Text>
                            </View>
                        </View>
                        <View className="p-4 rounded-xl items-center mb-4" style={{ backgroundColor: `${profitColor}18` }}>
                            <Text className="text-[12px] text-gray-600">
                                {profit >= 0 ? 'Bénéfice' : 'Perte'}
                            </Text>
                            <Text className="text-2xl font-bold" style={{ color: profitColor }}>
                                {formatAr(profit)} Ar
                            </Text>
                        </View>

                        <Text className="text-[12px] font-bold text-primary mb-2">Détail des coûts</Text>
                        <View className="gap-1 mb-2">
                            <View className="flex-row justify-between py-1">
                                <Text className="text-[13px] text-gray-600">Achats animaux</Text>
                                <Text className="text-[13px] font-semibold">{formatAr(finance.purchaseCost)} Ar</Text>
                            </View>
                            <View className="flex-row justify-between py-1">
                                <Text className="text-[13px] text-gray-600">Alimentation</Text>
                                <Text className="text-[13px] font-semibold">{formatAr(finance.feedCost)} Ar</Text>
                            </View>
                            <View className="flex-row justify-between py-1">
                                <Text className="text-[13px] text-gray-600">Autres dépenses</Text>
                                <Text className="text-[13px] font-semibold">{formatAr(finance.otherExpenses)} Ar</Text>
                            </View>
                        </View>
                        <Text className="text-[11px] text-gray-400 mt-2">
                            {finance.soldPigsCount} cochon(s) + {finance.soldPigletsCount} porcelet(s) vendus
                        </Text>
                    </View>
                ) : (
                    <View className="bg-white rounded-[25px] p-6 mb-4 items-center">
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                )}

                <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4 mb-4">
                    <Text className="text-primary font-bold mb-3">Nouvelle dépense</Text>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-3"
                        value={expenseAmount}
                        onChangeText={setExpenseAmount}
                        placeholder="Montant (Ar)"
                        keyboardType="numeric"
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                        {EXPENSE_CATEGORIES.map((c) => (
                            <TouchableOpacity
                                key={c.key}
                                className={`py-2 px-3 rounded-lg border mr-2 ${expenseCategory === c.key ? 'bg-primary border-primary' : 'border-border'}`}
                                onPress={() => setExpenseCategory(c.key)}
                            >
                                <Text className={`text-[12px] font-semibold ${expenseCategory === c.key ? 'text-white' : 'text-text'}`}>
                                    {c.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TextInput
                        className="bg-background border border-border rounded-xl p-3 mb-3"
                        value={expenseNote}
                        onChangeText={setExpenseNote}
                        placeholder="Note (optionnel)"
                    />
                    <TouchableOpacity
                        className="bg-secondary p-4 rounded-[15px] items-center"
                        onPress={handleAddExpense}
                        disabled={savingExpense}
                    >
                        <Text className="text-white font-bold">
                            {savingExpense ? '...' : 'Enregistrer la dépense'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {finance && finance.expenses.length > 0 && (
                    <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4 mb-4">
                        <Text className="text-primary font-bold mb-3">Dépenses récentes</Text>
                        {finance.expenses.slice(0, 15).map((e) => (
                            <View
                                key={e.id}
                                className="flex-row justify-between items-center border-b border-gray-100 py-3"
                            >
                                <View className="flex-1 pr-2">
                                    <Text className="font-semibold text-[14px]">
                                        {CATEGORY_LABELS[e.category] || e.category}
                                    </Text>
                                    <Text className="text-[11px] text-gray-500">
                                        {new Date(e.date).toLocaleDateString()}
                                        {e.note ? ` — ${e.note}` : ''}
                                    </Text>
                                </View>
                                <Text className="font-bold text-danger mr-3">{formatAr(Number(e.amountAriary))} Ar</Text>
                                <TouchableOpacity onPress={() => handleDeleteExpense(e.id)}>
                                    <Text className="text-danger text-[12px] font-bold">✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {finance && finance.recentSales.length > 0 && (
                    <View className="bg-white rounded-[25px] p-6 shadow-xl shadow-primary/10 elevation-4">
                        <Text className="text-primary font-bold mb-3">Ventes récentes</Text>
                        {finance.recentSales.map((s) => (
                            <View
                                key={`${s.kind}-${s.id}`}
                                className="flex-row justify-between items-center border-b border-gray-100 py-3"
                            >
                                <View className="flex-1">
                                    <Text className="font-semibold text-[14px]">{s.name}</Text>
                                    <Text className="text-[11px] text-gray-500">
                                        {s.saleDate ? new Date(s.saleDate).toLocaleDateString() : ''}
                                        {s.saleWeightKg != null ? ` · ${s.saleWeightKg} kg` : ''}
                                    </Text>
                                </View>
                                <Text className="font-bold text-success">{formatAr(s.salePrice)} Ar</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
}
