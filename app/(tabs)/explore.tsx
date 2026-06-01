import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { healthService } from '../../services/api';
import { Colors, Typography } from '../../constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNavigation } from 'expo-router';

export default function HealthScreen() {
  const [reminders, setReminders] = useState<any[]>([]);

  const loadReminders = async () => {
    try {
      const data = await healthService.getUpcoming();
      setReminders(data);

      data.forEach((item: any) => {
        import('../../utils/notifications').then(({ scheduleReminder }) => {
          scheduleReminder(
            `Rappel Vaccin: ${item.vaccineType.name}`,
            `${item.pig.name} doit recevoir son vaccin.`,
            new Date(item.nextDueDate),
            `vaccine-${item.id}`
          );
        });
      });
    } catch (error) {
      console.log('Backend unreachable');
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const renderReminder = ({ item }: { item: any }) => (
    <View className="flex-row bg-white rounded-[20px] p-[15px] mb-[15px] items-center shadow-xl shadow-primary/10 elevation-3">
      <View className="items-center justify-center w-[65px] h-[65px] bg-background rounded-[15px]">
        <Text className="text-[22px] font-bold text-primary">{new Date(item.nextDueDate).getDate()}</Text>
        <Text className="text-[10px] text-primary uppercase font-bold">
          {new Date(item.nextDueDate).toLocaleString('default', { month: 'short' })}
        </Text>
      </View>
      <View className="flex-1 pl-[15px]">
        <Text className="text-text text-base font-semibold">{item.vaccineType.name}</Text>
        <View className="flex-row items-center gap-1 mt-1">
          <IconSymbol name="pawprint.fill" size={14} color={Colors.primary} />
          <Text className="text-primary text-[12px]">{item.pig.name}</Text>
        </View>
      </View>
      <TouchableOpacity className="p-1">
        <IconSymbol name="checkmark.circle.fill" size={32} color={Colors.success} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="p-8 bg-primary rounded-b-[35px] mb-2.5">
        <Text className="text-secondary text-[28px] font-bold">Santé & prévention</Text>
        <Text className="text-white opacity-80 text-[14px]">Rappels de vaccination pour votre cheptel</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {reminders.length > 0 ? (
          reminders.map(item => (
            <View key={item.id}>{renderReminder({ item })}</View>
          ))
        ) : (
          <View className="items-center mt-[100px] p-10">
            <IconSymbol name="calendar" size={80} color={Colors.border} />
            <Text className="text-primary mt-5 text-center opacity-60">Tout est à jour !{'\n'}Aucun vaccin prévu prochainement.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

