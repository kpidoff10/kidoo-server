import { z } from 'zod';

export const postFormSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').min(3, 'Min 3 caractères').max(200),
  excerpt: z.string().max(500).optional().or(z.literal('')),
  content: z.string().min(10, 'Le contenu doit contenir au moins 10 caractères'),
  imageUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  type: z.enum(['update', 'promo', 'feature', 'news']),
  published: z.boolean().default(false),
});

export type PostFormData = z.infer<typeof postFormSchema>;
