import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diseaseService, Disease } from '../services/disease.service';

export const useDiseases = (patientId?: string) => {
    const queryClient = useQueryClient();

    const diseasesQuery = useQuery({
        queryKey: ['diseases', patientId],
        queryFn: () => diseaseService.getByPatient(patientId!),
        enabled: !!patientId,
    });

    const createDiseaseMutation = useMutation({
        mutationFn: (data: Partial<Disease>) => diseaseService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diseases', patientId] });
        },
    });

    const updateDiseaseMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Disease> }) =>
            diseaseService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diseases', patientId] });
        },
    });

    const deleteDiseaseMutation = useMutation({
        mutationFn: (id: string) => diseaseService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diseases', patientId] });
        },
    });

    const migrateMutation = useMutation({
        mutationFn: () => diseaseService.migrate(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['diseases', patientId] });
            queryClient.invalidateQueries({ queryKey: ['medicines', patientId] });
        },
    });

    return {
        diseases: diseasesQuery.data || [],
        isLoading: diseasesQuery.isLoading,
        error: diseasesQuery.error,
        isError: diseasesQuery.isError,
        refetch: diseasesQuery.refetch,
        createDisease: createDiseaseMutation.mutateAsync,
        updateDisease: updateDiseaseMutation.mutateAsync,
        deleteDisease: deleteDiseaseMutation.mutateAsync,
        migrate: migrateMutation.mutateAsync,
        isMigrating: migrateMutation.isPending,
    };
};
