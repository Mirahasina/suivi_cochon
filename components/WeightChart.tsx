import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants/theme';

interface WeightPoint {
    date: string;
    weight: number;
    isManual?: boolean;
}

interface NormPoint {
    week: number;
    expectedWeight: number;
}

interface Props {
    weights: WeightPoint[];
    norms?: NormPoint[];
    height?: number;
}

export function WeightChart({ weights, norms = [], height = 140 }: Props) {
    if (!weights.length) {
        return (
            <View className="h-[100px] items-center justify-center">
                <Text className="text-text opacity-40 text-[12px]">Pas encore de données de poids</Text>
            </View>
        );
    }

    const allValues = [
        ...weights.map((w) => w.weight),
        ...norms.map((n) => n.expectedWeight),
    ];
    const min = Math.min(...allValues) * 0.9;
    const max = Math.max(...allValues) * 1.1;
    const range = max - min || 1;

    const toY = (v: number) => height - ((v - min) / range) * (height - 20) - 10;

    const barWidth = Math.max(12, Math.min(28, 280 / weights.length));

    return (
        <View style={{ height: height + 30 }}>
            <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 }}>
                {weights.map((w, i) => {
                    const barH = ((w.weight - min) / range) * (height - 20);
                    return (
                        <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ fontSize: 9, color: Colors.primary, marginBottom: 2 }}>
                                {w.weight.toFixed(0)}
                            </Text>
                            <View
                                style={{
                                    width: barWidth,
                                    height: Math.max(barH, 4),
                                    backgroundColor: w.isManual ? Colors.secondary : Colors.primary,
                                    borderRadius: 4,
                                    opacity: w.isManual ? 1 : 0.7,
                                }}
                            />
                        </View>
                    );
                })}
            </View>
            {norms.length > 0 && (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height, pointerEvents: 'none' }}>
                    {norms.map((n, i) => (
                        <View
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${(i / Math.max(norms.length - 1, 1)) * 85 + 5}%`,
                                top: toY(n.expectedWeight),
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: Colors.danger,
                                opacity: 0.6,
                            }}
                        />
                    ))}
                </View>
            )}
            <View className="flex-row justify-between mt-2 px-1">
                <Text className="text-[10px] text-text opacity-50">
                    {new Date(weights[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
                <Text className="text-[10px] text-text opacity-50">● norme  ■ réel</Text>
                <Text className="text-[10px] text-text opacity-50">
                    {new Date(weights[weights.length - 1].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
            </View>
        </View>
    );
}
