import { z } from 'zod/v4';

export const JournalEntrySchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  situation: z.string().min(1, 'Опиши ситуацию'),
  thoughts: z.string().min(1, 'Опиши свои мысли'),
  physical: z.string().optional(),
  sudsBefore: z.number().min(0).max(100),
  sudsAfter: z.number().min(0).max(100).optional(),
  newView: z.string().optional(),
  emotionId: z.string().optional(),
  emotionName: z.string().optional(),
  patternId: z.string().optional(),
  patternName: z.string().optional(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

export const ThoughtPatternSchema = z.object({
  id: z.string(),
  friendlyName: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
  reframingQuestions: z.array(z.string()),
});
export type ThoughtPattern = z.infer<typeof ThoughtPatternSchema>;

export const ExposureStepSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Укажи название шага'),
  initialSuds: z.number().min(0).max(100),
  order: z.number(),
});
export type ExposureStep = z.infer<typeof ExposureStepSchema>;

export const ExposureHierarchySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Дай название лестнице'),
  steps: z.array(ExposureStepSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ExposureHierarchy = z.infer<typeof ExposureHierarchySchema>;

export const ExposureSessionSchema = z.object({
  id: z.string(),
  hierarchyId: z.string(),
  stepId: z.string(),
  stepName: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationSeconds: z.number(),
  sudsChecks: z.array(z.object({
    time: z.number(),
    suds: z.number().min(0).max(100),
  })),
  reflection: z.string().optional(),
});
export type ExposureSession = z.infer<typeof ExposureSessionSchema>;

export const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  condition: z.string(),
  premium: z.boolean().optional(),
  unlockedAt: z.string().datetime().optional(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const UserEntitlementSchema = z.object({
  tier: z.enum(['free', 'premium']),
  expiresAt: z.string().datetime().optional(),
  trialStartedAt: z.string().datetime().optional(),
  trialUsed: z.boolean(),
});
export type UserEntitlement = z.infer<typeof UserEntitlementSchema>;

export const PaymentMethodSchema = z.enum(['yookassa_card', 'sbp', 'manual_transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const MoodEntrySchema = z.object({
  date: z.string(),
  mood: z.number().min(1).max(5),
  note: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type MoodEntry = z.infer<typeof MoodEntrySchema>;

export type ThemeId = 'light' | 'dark' | 'warm' | 'forest' | 'ocean';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  preview: { bg: string; primary: string; accent: string };
}