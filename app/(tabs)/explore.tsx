import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { healthService, VaccineSuggestion } from '../../services/api';
import { Colors } from '../../constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HealthScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<VaccineSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [biosecurity, setBiosecurity] = useState<{ title: string; alert: string; symptoms: string[]; prevention: string[] } | null>(null);
  const [showPpa, setShowPpa] = useState(true);

  const loadReminders = async () => {
    setError(null);
    try {
      const [upcoming, suggested, bio] = await Promise.all([
        healthService.getUpcoming(),
        healthService.getSuggested(),
        healthService.getBiosecurity().catch(() => null),
      ]);
      setReminders(upcoming);
      setSuggestions(suggested);
      if (bio) setBiosecurity(bio);

      upcoming.forEach((item: any) => {
        import('../../utils/notifications').then(({ scheduleReminder }) => {
          scheduleReminder(
            `Rappel Vaccin: ${item.vaccineType.name}`,
            `${item.pig.name} doit recevoir son vaccin.`,
            new Date(item.nextDueDate),
            `vaccine-${item.id}`
          );
        });
      });

      suggested.filter((s) => s.status === 'overdue').forEach((s) => {
        import('../../utils/notifications').then(({ scheduleNotification }) => {
          scheduleNotification(`Vaccin en retard: ${s.vaccineName}`, `${s.pigName} — ${s.label}`);
        });
      });
    } catch (err) {
      setError('Serveur inaccessible. Attendez 1 min si Render est en veille, puis réessayez.');
      console.log('Backend unreachable', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReminders();
    }, [])
  );

  const handleMarkDone = async (s: VaccineSuggestion) => {
    const key = `${s.pigId}-${s.vaccineTypeId}`;
    setRecordingId(key);
    try {
      await healthService.recordVaccination({
        pigId: s.pigId,
        vaccineTypeId: s.vaccineTypeId,
        date: new Date().toISOString(),
        notes: `Planning: ${s.label}`,
      });
      loadReminders();
    } catch {
      alert('Erreur');
    } finally {
      setRecordingId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'overdue') return Colors.danger;
    if (status === 'due') return Colors.secondary;
    return Colors.primary;
  };

  return (
    <View className="flex-1 bg-background">
      <View className="p-8 bg-primary rounded-b-[35px] mb-2.5">
        <Text className="text-secondary text-[28px] font-bold">Santé & prévention</Text>
        <Text className="text-white opacity-80 text-[14px]">Planning vaccinal automatique selon l&apos;âge</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReminders(); }} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} className="mt-20" />
        ) : error ? (
          <View className="items-center mt-20 p-6">
            <IconSymbol name="wifi.slash" size={60} color={Colors.danger} />
            <Text className="text-danger mt-4 text-center font-semibold">{error}</Text>
            <TouchableOpacity className="bg-primary mt-6 px-8 py-3 rounded-xl" onPress={loadReminders}>
              <Text className="text-white font-bold">Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {biosecurity && showPpa && (
              <View className="bg-[#FFEBEE] rounded-[20px] p-4 mb-5 border-2 border-danger">
                <TouchableOpacity onPress={() => setShowPpa(false)} className="absolute top-2 right-3">
                  <Text className="text-danger font-bold">✕</Text>
                </TouchableOpacity>
                <Text className="text-danger font-bold text-base mb-1">🚨 {biosecurity.title}</Text>
                <Text className="text-[12px] text-text mb-3">{biosecurity.alert}</Text>
                <Text className="text-[12px] font-bold text-text mb-1">Signes à surveiller :</Text>
                {biosecurity.symptoms.slice(0, 3).map((s, i) => (
                  <Text key={i} className="text-[11px] text-text opacity-80">• {s}</Text>
                ))}
                <Text className="text-[12px] font-bold text-text mt-2 mb-1">Prévention :</Text>
                {biosecurity.prevention.slice(0, 3).map((p, i) => (
                  <Text key={i} className="text-[11px] text-text opacity-80">• {p}</Text>
                ))}
              </View>
            )}

            {suggestions.length > 0 && (
              <View className="mb-6">
                <Text className="text-primary text-lg font-bold mb-3">À faire selon l&apos;âge</Text>
                {suggestions.map((s) => (
                  <View key={`${s.pigId}-${s.vaccineTypeId}`} className="bg-white rounded-[20px] p-4 mb-3 shadow-md">
                    <View className="flex-row items-start">
                      <View className="flex-1">
                        <Text className="font-bold text-text">{s.vaccineName}</Text>
                        <TouchableOpacity onPress={() => router.push(`/pig/${s.pigId}`)}>
                          <Text className="text-primary text-[12px] mt-0.5">🐷 {s.pigName} ({s.ageInDays} jours)</Text>
                        </TouchableOpacity>
                        <Text className="text-[11px] text-text opacity-60 mt-1">{s.label}</Text>
                        {s.injectionRouteLabel && (
                          <Text className="text-[10px] text-primary">💉 {s.injectionRouteLabel} — {s.injectionSite}</Text>
                        )}
                        <Text className="text-[11px] font-bold mt-1" style={{ color: statusColor(s.status) }}>
                          {s.status === 'overdue' ? '⚠️ En retard' : s.status === 'due' ? 'À faire' : 'Bientôt'} — {new Date(s.scheduledDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="bg-primary px-3 py-2 rounded-lg"
                        onPress={() => handleMarkDone(s)}
                        disabled={recordingId === `${s.pigId}-${s.vaccineTypeId}`}
                      >
                        <Text className="text-white text-[11px] font-bold">Fait ✓</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text className="text-primary text-lg font-bold mb-3">Rappels de rappel</Text>
            {reminders.length > 0 ? (
              reminders.map(item => (
                <View key={item.id} className="flex-row bg-white rounded-[20px] p-[15px] mb-[15px] items-center shadow-xl shadow-primary/10">
                  <View className="items-center justify-center w-[65px] h-[65px] bg-background rounded-[15px]">
                    <Text className="text-[22px] font-bold text-primary">{new Date(item.nextDueDate).getDate()}</Text>
                    <Text className="text-[10px] text-primary uppercase font-bold">
                      {new Date(item.nextDueDate).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  <View className="flex-1 pl-[15px]">
                    <Text className="text-text text-base font-semibold">{item.vaccineType.name}</Text>
                    <TouchableOpacity onPress={() => router.push(`/pig/${item.pig.id}`)}>
                      <Text className="text-primary text-[12px]">{item.pig.name}</Text>
                    </TouchableOpacity>
                  </View>
                  <IconSymbol name="syringe.fill" size={28} color={Colors.secondary} />
                </View>
              ))
            ) : (
              <View className="items-center p-8 bg-white rounded-[20px]">
                <IconSymbol name="calendar" size={50} color={Colors.border} />
                <Text className="text-primary mt-3 text-center opacity-60">Aucun rappel de vaccin prévu.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
