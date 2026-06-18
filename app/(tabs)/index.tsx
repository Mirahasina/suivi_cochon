import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { usePigs } from '../../hooks/usePigs'; // Import custom hook
import { Pig } from '../../services/api';

export default function HomeScreen() {
  const { data: pigs = [], isLoading, isError, refetch, isRefetching } = usePigs();
  const router = useRouter();
  const [showWakeHint, setShowWakeHint] = useState(false);

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Le serveur (hébergement gratuit) peut mettre jusqu'à ~1 min à se réveiller.
  // Après quelques secondes de chargement, on prévient l'utilisateur au lieu
  // de laisser un écran de chargement muet ou une erreur trompeuse.
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowWakeHint(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowWakeHint(false);
  }, [isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-8">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="mt-4 text-gray-500">Chargement des cochons...</Text>
        {showWakeHint && (
          <Text className="mt-2 text-center text-gray-400 text-[13px]">
            Le serveur se réveille, cela peut prendre jusqu&apos;à une minute. Merci de patienter…
          </Text>
        )}
      </View>
    );
  }

  if (isError && (!pigs || pigs.length === 0)) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-8">
        <IconSymbol name="exclamationmark.triangle" size={64} color={Colors.danger} />
        <Text className="mt-5 text-center text-lg font-bold">Connexion impossible</Text>
        <Text className="mt-2 text-center text-gray-600">
          Le serveur n&apos;a pas répondu à temps. Il était peut-être en veille : appuyez sur
          « Réessayer », le réveil peut prendre jusqu&apos;à une minute.
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary px-6 py-3 rounded-xl flex-row items-center"
          onPress={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
          <Text className="text-white font-bold">{isRefetching ? 'Connexion…' : 'Réessayer'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPigItem = ({ item }: { item: Pig }) => (
    <TouchableOpacity
      className="bg-white rounded-[20px] p-5 mx-5 mb-4 shadow-xl shadow-primary/10 elevation-4"
      onPress={() => router.push(`/pig/${item.id}`)}
    >
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-primary font-bold text-xl">{item.name}</Text>
        <Text className="bg-background px-3 py-1 rounded-xl text-primary text-[12px] font-bold">{item.breed}</Text>
      </View>
      <View className="flex-row gap-5">
        <View className="flex-1">
          <Text className="text-primary opacity-60 text-[12px] mb-1">Âge</Text>
          <Text className="font-semibold text-base">{item.ageFormatted}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-primary opacity-60 text-[12px] mb-1">Statut</Text>
          <Text className="font-semibold text-base">{item.isCastrated ? 'Castré' : 'Entier'}</Text>
        </View>
      </View>
      {item.currentStatus?.isUnderweight && (
        <View className="mt-4 bg-[#FFF0F0] p-2.5 rounded-xl border-l-4 border-l-danger">
          <Text className="text-danger font-bold text-[13px]">⚠️ croissance à surveiller</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={pigs}
        renderItem={renderPigItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <View className="p-6 bg-primary rounded-b-[30px] mb-4">
            <Text className="text-secondary font-bold text-3xl">Mon élevage</Text>
            <Text className="text-white opacity-80 text-base">{pigs.length} cochons actifs</Text>
            {isError && (
              <View className="mt-2 bg-danger/20 p-2 rounded-lg">
                <Text className="text-white font-bold text-xs">⚠️ Mode Hors-Ligne (Données en cache)</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center mt-24 p-8">
            <IconSymbol name="house" size={64} color={Colors.border} />
            <Text className="mt-5 mb-8 text-center text-base">Votre enclos est vide.</Text>
            <TouchableOpacity
              className="bg-secondary px-8 py-4 rounded-[15px]"
              onPress={() => router.push('/add-pig')}
            >
              <Text className="text-white font-bold text-base">Ajouter mon premier cochon</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        className="absolute right-6 bottom-6 bg-primary w-[65px] h-[65px] rounded-full items-center justify-center elevation-6 shadow-primary/30 border-2 border-secondary"
        onPress={() => router.push('/add-pig')}
      >
        <Text className="text-secondary text-4xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
