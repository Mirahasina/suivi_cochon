import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24,
            staleTime: 1000 * 60 * 5,
            retry: 2,
        },
    },
});

export const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
});
