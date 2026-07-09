import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { healthService, VaccineSuggestion, VaccineType } from '../../services/api';
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
  const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
  const [showVaccineManager, setShowVaccineManager] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [newVaccineName, setNewVaccineName] = useState('');
  const [newRecallDays, setNewRecallDays] = useState('90');
  const [customRecall, setCustomRecall] = useState('');

  const RECALL_PRESETS = [
    { label: '7 j', days: 7 },
    { label: '1 mois', days: 30 },
    { label: '2 mois', days: 60 },
    { label: '3 mois', days: 90 },
    { label: '6 mois', days: 180 },
    { label: '1 an', days: 365 },
    { label: '2 ans', days: 730 },
  ];

  const loadReminders = async () => {
    setError(null);
    try {
      const [upcoming, suggested, bio, types] = await Promise.all([
        healthService.getUpcoming(),
        healthService.getSuggested(),
        healthService.getBiosecurity().catch(() => null),
        healthService.getVaccineTypes().catch(() => []),
      ]);
      setReminders(upcoming);
      setSuggestions(suggested);
      setVaccineTypes(types);
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

  const toggleVaccine = async (v: VaccineType, enabled: boolean) => {
    try {
      await healthService.setVaccineEnabled(v.id, enabled);
      setVaccineTypes((prev) => prev.map((x) => (x.id === v.id ? { ...x, isEnabled: enabled } : x)));
      loadReminders();
    } catch {
      alert('Erreur');
    }
  };

  const handleAddCustomVaccine = async () => {
    const name = newVaccineName.trim();
    const days = Number(customRecall || newRecallDays);
    if (!name || Number.isNaN(days) || days < 1) return;
    try {
      const created = await healthService.createVaccineType({
        name,
        defaultRecallDays: days,
        target: 'ALL',
        timingNote: `Rappel tous les ${days} jours`,
      });
      setVaccineTypes((prev) => [...prev, created]);
      setNewVaccineName('');
      setCustomRecall('');
      setShowAddVaccine(false);
      loadReminders();
    } catch {
      alert('Impossible d\'ajouter ce vaccin');
    }
  };

  const handleDeleteCustom = async (id: number) => {
    try {
      await healthService.deleteCustomVaccine(id);
      setVaccineTypes((prev) => prev.filter((v) => v.id !== id));
      loadReminders();
    } catch {
      alert('Erreur');
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
        <Text className="text-white opacity-80 text-[14px]">Planning + vaccins personnalisables</Text>
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
                  <Text className="text-danger font-bold">X</Text>
                </TouchableOpacity>
                <Text className="text-danger font-bold text-base mb-1">{biosecurity.title}</Text>
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
                          <Text className="text-primary text-[12px] mt-0.5">{s.pigName} ({s.ageInDays} jours)</Text>
                        </TouchableOpacity>
                        <Text className="text-[11px] text-text opacity-60 mt-1">{s.label}</Text>
                        {s.injectionRouteLabel && (
                          <Text className="text-[10px] text-primary">{s.injectionRouteLabel} — {s.injectionSite}</Text>
                        )}
                        <Text className="text-[11px] font-bold mt-1" style={{ color: statusColor(s.status) }}>
                          {s.status === 'overdue' ? 'En retard' : s.status === 'due' ? 'À faire' : 'Bientôt'} — {new Date(s.scheduledDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="bg-primary px-3 py-2 rounded-lg"
                        onPress={() => handleMarkDone(s)}
                        disabled={recordingId === `${s.pigId}-${s.vaccineTypeId}`}
                      >
                        <Text className="text-white text-[11px] font-bold">Fait</Text>
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

            <View className="bg-white rounded-[20px] p-4 mb-6 shadow-md">
              <TouchableOpacity onPress={() => setShowVaccineManager((v) => !v)}>
                <Text className="text-primary text-lg font-bold text-center">
                  {showVaccineManager ? 'Masquer les vaccins' : 'Gérer les vaccins'}
                </Text>
              </TouchableOpacity>
              <Text className="text-[11px] text-text opacity-50 text-center mt-1">
                Désactivez les facultatifs · ajoutez les vôtres avec rappel
              </Text>

              {showVaccineManager && (
                <View className="mt-4">
                  {vaccineTypes.map((v) => (
                    <View key={v.id} className="flex-row items-center py-2 border-b border-border/40">
                      <View className="flex-1 pr-2">
                        <Text className="text-[13px] font-semibold text-text">{v.name}</Text>
                        <Text className="text-[10px] text-text opacity-50">
                          {v.isCustom ? 'Personnalisé' : v.isMandatory ? 'Recommandé' : 'Facultatif'}
                          {v.defaultRecallDays ? ` · rappel ${v.defaultRecallDays} j` : ''}
                        </Text>
                      </View>
                      <Switch
                        value={v.isEnabled !== false}
                        onValueChange={(on) => toggleVaccine(v, on)}
                      />
                      {v.isCustom && (
                        <TouchableOpacity className="ml-2 px-2" onPress={() => handleDeleteCustom(v.id)}>
                          <Text className="text-danger text-[11px] font-bold">X</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity className="mt-3 py-2" onPress={() => setShowAddVaccine((v) => !v)}>
                    <Text className="text-secondary text-center font-semibold text-[13px]">
                      {showAddVaccine ? 'Annuler' : '+ Ajouter un vaccin'}
                    </Text>
                  </TouchableOpacity>

                  {showAddVaccine && (
                    <View className="mt-2 gap-2">
                      <TextInput
                        className="bg-background border border-border rounded-xl p-3 text-[13px]"
                        value={newVaccineName}
                        onChangeText={setNewVaccineName}
                        placeholder="Nom du vaccin / traitement"
                      />
                      <Text className="text-[11px] text-text opacity-60">Rappel après injection :</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {RECALL_PRESETS.map((p) => (
                          <TouchableOpacity
                            key={p.days}
                            className={`mr-2 px-3 py-2 rounded-full border ${newRecallDays === String(p.days) && !customRecall ? 'bg-primary border-primary' : 'border-border'}`}
                            onPress={() => { setNewRecallDays(String(p.days)); setCustomRecall(''); }}
                          >
                            <Text className={`text-[11px] font-semibold ${newRecallDays === String(p.days) && !customRecall ? 'text-white' : 'text-text'}`}>
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TextInput
                        className="bg-background border border-border rounded-xl p-3 text-[13px]"
                        value={customRecall}
                        onChangeText={setCustomRecall}
                        placeholder="Ou nombre de jours (ex: 45)"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity className="bg-primary p-3 rounded-xl items-center" onPress={handleAddCustomVaccine}>
                        <Text className="text-white font-bold">Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
