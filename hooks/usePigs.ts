import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pig, pigService } from '../services/api';

export const usePigs = () => {
    return useQuery({
        queryKey: ['pigs'],
        queryFn: pigService.getAll,
    });
};

export const usePig = (id: number) => {
    return useQuery({
        queryKey: ['pig', id],
        queryFn: () => pigService.getOne(id),
        enabled: !!id,
    });
};

export const useCreatePig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: pigService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
        },
    });
};

export const useUpdatePig = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Pig> }) => pigService.update(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pigs'] });
            queryClient.invalidateQueries({ queryKey: ['pig', variables.id] });
        },
    });
};
