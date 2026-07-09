import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import '../global.css';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { asyncStoragePersister, queryClient } from './query-client';
import { syncAll } from '../services/syncService';

import { useColorScheme } from '@/hooks/use-color-scheme';

import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    syncAll().then((result) => {
      if (result.synced > 0) {
        queryClient.invalidateQueries();
      }
    });
  }, []);

  useEffect(() => {

    let Notifications;
    try {
      if (!isExpoGo) {
        Notifications = require('expo-notifications');
      }
    } catch (e) {
      console.log('expo-notifications not available');
      return;
    }

    if (Notifications) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch (e) { console.log('Handler setup failed', e); }

      registerForPushNotificationsAsync();

      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('Notification Received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('Notification Response:', response);
      });
    }

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
