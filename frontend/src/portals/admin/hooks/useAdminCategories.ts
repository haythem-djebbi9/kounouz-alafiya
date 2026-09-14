import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Categorie } from '../../../lib/api-types';

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<Categorie[]>('/categories/admin'),
  });
}

export interface CategorieFormInput {
  nom: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  ordre?: number;
  parentId?: string;
  actif?: boolean;
}

export function useCreateCategorie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategorieFormInput) => api.post<Categorie>('/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}

export function useUpdateCategorie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CategorieFormInput & { id: string }) =>
      api.patch<Categorie>(`/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}

export function useDeleteCategorie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });
}
