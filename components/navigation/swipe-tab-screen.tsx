import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import React, { PropsWithChildren, useMemo } from 'react';
import { PanResponder, View } from 'react-native';

const TABS = [
    'index',
    'reproduction',
    'explore',
    'assistant',
    'settings',
] as const;

type TabName = (typeof TABS)[number];

function navigateToTab(router: ReturnType<typeof useRouter>, tab: TabName) {
    switch (tab) {
        case 'index':
            router.navigate('/');
            break;
        case 'reproduction':
            router.navigate('/(tabs)/reproduction');
            break;
        case 'explore':
            router.navigate('/(tabs)/explore');
            break;
        case 'assistant':
            router.navigate('/(tabs)/assistant' as Href);
            break;
        case 'settings':
            router.navigate('/(tabs)/settings' as Href);
            break;
    }
}

export function SwipeTabScreen({
    tab,
    children,
}: PropsWithChildren<{ tab: TabName }>) {
    const router = useRouter();

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    Math.abs(gesture.dx) > 24 &&
                    Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
                onPanResponderRelease: (_, gesture) => {
                    if (
                        Math.abs(gesture.dx) < 70 ||
                        Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.4
                    ) {
                        return;
                    }

                    const currentIndex = TABS.findIndex((item) => item === tab);
                    const nextIndex = currentIndex + (gesture.dx < 0 ? 1 : -1);
                    const nextTab = TABS[nextIndex];
                    if (nextTab) navigateToTab(router, nextTab);
                },
                onPanResponderTerminationRequest: () => true,
                onShouldBlockNativeResponder: () => false,
            }),
        [router, tab],
    );

    return (
        <View className="flex-1" {...panResponder.panHandlers}>
            {children}
        </View>
    );
}
