import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_URL, api, resolveFileUrl } from './api';

// Blog de la vitrine : articles rédigés dans la console d'administration, en
// arabe, français et anglais. Une langue laissée vide se rabat sur une autre.

export type BlogLanguage = 'ar' | 'fr' | 'en';
export type LocalizedText = Partial<Record<BlogLanguage, string>>;
export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export const BLOG_CATEGORIES = ['CONSEILS', 'SANTE', 'TERROIR', 'APICULTURE', 'TRACABILITE', 'ACTUALITES'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface BlogPostSummary {
  id: string;
  slug: string;
  category: BlogCategory;
  title: LocalizedText;
  excerpt: LocalizedText;
  coverImage: string | null;
  hasUploadedCover: boolean;
  readingMinutes: number;
  status: BlogStatus;
  featured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string } | null;
}

export interface BlogPost extends BlogPostSummary {
  content: LocalizedText;
}

const FALLBACK_ORDER: BlogLanguage[] = ['fr', 'ar', 'en'];

/** Texte dans la langue voulue, sinon dans une autre ; `lang` dit laquelle a servi. */
export function pickLocalized(text: LocalizedText | undefined, lang: string): { text: string; lang: BlogLanguage } {
  const order = [lang as BlogLanguage, ...FALLBACK_ORDER.filter((l) => l !== lang)];
  for (const l of order) {
    const value = text?.[l];
    if (value) return { text: value, lang: l };
  }
  return { text: '', lang: (lang as BlogLanguage) ?? 'fr' };
}

/** Image de couverture : fichier téléversé (servi par l'API) ou adresse saisie. */
export function blogCoverUrl(post: Pick<BlogPostSummary, 'id' | 'hasUploadedCover' | 'coverImage' | 'updatedAt'>): string | null {
  if (post.hasUploadedCover) return `${API_URL}/blog/${post.id}/cover?v=${Date.parse(post.updatedAt)}`;
  return post.coverImage ? resolveFileUrl(post.coverImage) : null;
}

export const BLOG_FALLBACK_COVER = '/images/3sal.webp';

// --- Vitrine -------------------------------------------------------------------

export function usePublicBlogPosts(limit?: number) {
  return useQuery({
    queryKey: ['public', 'blog', limit ?? 'all'],
    queryFn: () => api.get<BlogPostSummary[]>(`/blog${limit ? `?limit=${limit}` : ''}`, { skipAuth: true }),
    staleTime: 5 * 60_000,
  });
}

export function usePublicBlogPost(slug: string | null) {
  return useQuery({
    queryKey: ['public', 'blog', 'post', slug],
    queryFn: () => api.get<BlogPost>(`/blog/${encodeURIComponent(slug!)}`, { skipAuth: true }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

// --- Console d'administration --------------------------------------------------

export interface BlogPostInput {
  title: LocalizedText;
  excerpt: LocalizedText;
  content: LocalizedText;
  category: BlogCategory;
  slug?: string;
  coverImage?: string | null;
  featured?: boolean;
  status?: BlogStatus;
}

export function useAdminBlogPosts() {
  return useQuery({ queryKey: ['admin', 'blog'], queryFn: () => api.get<BlogPostSummary[]>('/blog/admin') });
}

export function useAdminBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'blog', id],
    queryFn: () => api.get<BlogPost>(`/blog/admin/${id}`),
    enabled: !!id,
  });
}

function useInvalidateBlog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'blog'] });
    void queryClient.invalidateQueries({ queryKey: ['public', 'blog'] });
  };
}

export function useSaveBlogPost() {
  const invalidate = useInvalidateBlog();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<BlogPostInput> }) =>
      id ? api.patch<BlogPost>(`/blog/${id}`, body) : api.post<BlogPost>('/blog', body),
    onSuccess: invalidate,
  });
}

export function useDeleteBlogPost() {
  const invalidate = useInvalidateBlog();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/blog/${id}`),
    onSuccess: invalidate,
  });
}

export function useBlogCover() {
  const invalidate = useInvalidateBlog();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File | null }) => {
      if (!file) return api.delete<BlogPost>(`/blog/${id}/cover`);
      const form = new FormData();
      form.append('file', await shrinkImage(file));
      return api.post<BlogPost>(`/blog/${id}/cover`, form);
    },
    onSuccess: invalidate,
  });
}

/**
 * Réduit une photo avant l'envoi (1600 px de large au plus, JPEG) : une photo
 * de téléphone de 5 Mo devient ~200 Ko, plus rapide à envoyer comme à afficher.
 */
export async function shrinkImage(file: File, maxWidth = 1600): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    if (scale === 1 && file.size < 600_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
