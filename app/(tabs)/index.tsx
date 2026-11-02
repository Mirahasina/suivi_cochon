import { IconSymbol } from '@/components/ui/icon-symbol';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { SwipeTabScreen } from '../../components/navigation/swipe-tab-screen';
import { usePigs } from '../../hooks/usePigs';
import { Pig } from '../../services/api';

type PigFilter = 'ALL' | 'ACTIVE' | 'FEMALE' | 'MALE' | 'WATCH';

const PIG_FILTERS: { key: PigFilter; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'ACTIVE', label: 'Actifs' },
  { key: 'FEMALE', label: 'Femelles' },
  { key: 'MALE', label: 'Mâles' },
  { key: 'WATCH', label: 'À surveiller' },
];

export default function HomeScreen() {
  const { data: pigs = [], isLoading, isError, refetch, isRefetching } = usePigs();
  const router = useRouter();
  const [showWakeHint, setShowWakeHint] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PigFilter>('ALL');
  const [compactList, setCompactList] = useState(false);

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
      <SwipeTabScreen tab="index">
        <View className="flex-1 justify-center items-center bg-background px-8">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="mt-4 text-gray-500">Chargement des cochons...</Text>
          {showWakeHint && (
            <Text className="mt-2 text-center text-gray-400 text-[13px]">
              Le serveur se réveille, cela peut prendre jusqu&apos;à une minute. Merci de patienter…
            </Text>
          )}
        </View>
      </SwipeTabScreen>
    );
  }

  if (isError && (!pigs || pigs.length === 0)) {
    return (
      <SwipeTabScreen tab="index">
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
      </SwipeTabScreen>
    );
  }

  const renderPigItem = ({ item }: { item: Pig }) => (
    <TouchableOpacity
      className={`bg-white mx-5 mb-3 shadow-xl shadow-primary/10 elevation-2 ${compactList ? 'rounded-xl px-4 py-3' : 'rounded-[20px] p-5 elevation-4'}`}
      onPress={() => router.push(`/pig/${item.id}`)}
    >
      {compactList ? (
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-primary font-bold text-base">{item.name}</Text>
            <Text className="text-text opacity-60 text-xs">{item.breed} · {item.ageFormatted}</Text>
          </View>
          {item.currentStatus?.isUnderweight && (
            <Text className="text-danger text-xs font-bold mr-2">À surveiller</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </View>
      ) : (
        <>
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
              <Text className="text-danger font-bold text-[13px]">Croissance à surveiller</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  const activePigs = pigs.filter((pig) => pig.status === 'ACTIVE');
  const females = activePigs.filter((pig) => pig.gender === 'FEMALE').length;
  const pigsToWatch = activePigs.filter((pig) => pig.currentStatus?.isUnderweight).length;
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredPigs = pigs.filter((pig) => {
    const matchesSearch = `${pig.name} ${pig.breed}`.toLocaleLowerCase().includes(normalizedSearch);
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTIVE' && pig.status === 'ACTIVE') ||
      (filter === 'FEMALE' && pig.gender === 'FEMALE') ||
      (filter === 'MALE' && pig.gender === 'MALE') ||
      (filter === 'WATCH' && pig.status === 'ACTIVE' && pig.currentStatus?.isUnderweight);
    return matchesSearch && matchesFilter;
  });

  return (
    <SwipeTabScreen tab="index">
    <View className="flex-1 bg-background">
      <FlatList
        data={filteredPigs}
        renderItem={renderPigItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListHeaderComponent={
          <View className="mb-2">
            <View className="p-6 bg-primary rounded-b-[30px]">
              <Text className="text-secondary font-bold text-3xl">Mon élevage</Text>
              <Text className="text-white opacity-80 text-base">
                {activePigs.length} cochon{activePigs.length === 1 ? '' : 's'} actif{activePigs.length === 1 ? '' : 's'}
              </Text>
              {isError && pigs.length > 0 && (
                <View className="mt-2 bg-danger/20 p-2 rounded-lg">
                  <Text className="text-white font-bold text-xs">Mode hors ligne — données locales</Text>
                </View>
              )}
              {!isError && pigs.some((pig) => pig._pendingSync) && (
                <View className="mt-2 bg-secondary/30 p-2 rounded-lg">
                  <Text className="text-white text-xs">Certaines données seront synchronisées plus tard</Text>
                </View>
              )}
            </View>

            <View className="px-5 pt-5">
              <View className="flex-row gap-3 mb-5">
                <View className="flex-1 bg-white rounded-2xl p-4 items-center">
                  <Text className="text-primary text-2xl font-bold">{activePigs.length}</Text>
                  <Text className="text-text opacity-60 text-xs">Actifs</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 items-center">
                  <Text className="text-primary text-2xl font-bold">{females}</Text>
                  <Text className="text-text opacity-60 text-xs">Femelles</Text>
                </View>
                <View className="flex-1 bg-white rounded-2xl p-4 items-center">
                  <Text style={{ color: pigsToWatch ? Colors.danger : Colors.success }} className="text-2xl font-bold">
                    {pigsToWatch}
                  </Text>
                  <Text className="text-text opacity-60 text-xs">À surveiller</Text>
                </View>
              </View>

              <Text className="text-primary font-bold mb-3">Accès rapide</Text>
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter un cochon"
                  className="flex-1 bg-white rounded-2xl p-3 items-center"
                  onPress={() => router.push('/add-pig')}
                >
                  <Ionicons name="add-circle-outline" size={25} color={Colors.primary} />
                  <Text className="text-primary text-xs font-semibold mt-1">Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir le suivi de reproduction"
                  className="flex-1 bg-white rounded-2xl p-3 items-center"
                  onPress={() => router.push('/(tabs)/reproduction')}
                >
                  <Ionicons name="heart-outline" size={25} color={Colors.primary} />
                  <Text className="text-primary text-xs font-semibold mt-1">Reproduction</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir le suivi de santé"
                  className="flex-1 bg-white rounded-2xl p-3 items-center"
                  onPress={() => router.push('/(tabs)/explore')}
                >
                  <Ionicons name="medkit-outline" size={25} color={Colors.primary} />
                  <Text className="text-primary text-xs font-semibold mt-1">Santé</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                accessibilityLabel="Rechercher un cochon par nom ou par race"
                className="bg-white border border-border rounded-xl px-4 py-3"
                placeholder="Rechercher par nom ou par race"
                placeholderTextColor="#8A8A8A"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCapitalize="none"
              />
              <View className="flex-row items-center justify-between mt-5 mb-3">
                <Text className="text-primary font-bold">Mes cochons ({filteredPigs.length})</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={compactList ? 'Afficher les fiches détaillées' : 'Afficher la liste compacte'}
                  onPress={() => setCompactList((value) => !value)}
                  className="flex-row items-center px-3 py-2 rounded-lg bg-white"
                >
                  <Ionicons
                    name={compactList ? 'list-outline' : 'reorder-three-outline'}
                    size={18}
                    color={Colors.primary}
                  />
                  <Text className="text-primary text-xs font-semibold ml-1">
                    {compactList ? 'Détaillé' : 'Compact'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row mb-3">
                {PIG_FILTERS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === option.key }}
                    onPress={() => setFilter(option.key)}
                    className={`mr-2 px-3 py-2 rounded-full ${filter === option.key ? 'bg-primary' : 'bg-white'}`}
                  >
                    <Text className={`text-xs font-semibold ${filter === option.key ? 'text-white' : 'text-primary'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center mt-24 p-8">
            {search.trim() || filter !== 'ALL' ? (
              <>
                <IconSymbol name="magnifyingglass" size={48} color={Colors.border} />
                <Text className="mt-5 text-center text-base">Aucun cochon ne correspond à cette recherche.</Text>
              </>
            ) : (
              <>
                <IconSymbol name="house" size={64} color={Colors.border} />
                <Text className="mt-5 mb-8 text-center text-base">Votre enclos est vide.</Text>
                <TouchableOpacity
                  className="bg-secondary px-8 py-4 rounded-[15px]"
                  onPress={() => router.push('/add-pig')}
                >
                  <Text className="text-white font-bold text-base">Ajouter mon premier cochon</Text>
                </TouchableOpacity>
              </>
            )}
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
    </SwipeTabScreen>
  );
}
