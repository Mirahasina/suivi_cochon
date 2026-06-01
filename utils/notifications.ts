import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerForPushNotificationsAsync() {

    if (isExpoGo) {
        console.log('Push notifications are not supported in Expo Go (SDK 53+).');
        return;
    }

    let Notifications;
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        console.log('expo-notifications not available');
        return;
    }

    let token;
    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }

        /*
        if (!isExpoGo) {
            try {
                const tokenData = await Notifications.getExpoPushTokenAsync();
                token = tokenData.data;
            } catch (error) {
                console.log('Skipping remote push token generation.');
            }
        }
        */
    } else {
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}

export async function scheduleNotification(title: string, body: string, seconds: number = 1) {

    if (isExpoGo) return;

    let Notifications;
    try {
        Notifications = require('expo-notifications');
    } catch (e) { return; }

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: { data: 'goes here' },
        },
        trigger: seconds > 0 ? null : null,
    });
}

export async function scheduleReminder(title: string, body: string, date: Date, id: string) {

    if (isExpoGo) return;

    let Notifications;
    try {
        Notifications = require('expo-notifications');
    } catch (e) { return; }

    await Notifications.scheduleNotificationAsync({
        identifier: `${id}-J`,
        content: {
            title,
            body,
        },
        trigger: date,
    });

    const dayBefore = new Date(date);
    dayBefore.setDate(date.getDate() - 1);
    dayBefore.setHours(9, 0, 0, 0); // 9:00 AM

    if (dayBefore > new Date()) {
        await Notifications.scheduleNotificationAsync({
            identifier: `${id}-J-1`,
            content: {
                title: `Rappel Demain: ${title}`,
                body: `Demain: ${body}`,
            },
            trigger: dayBefore,
        });
    }
}
