import {z} from 'zod';

/** Standard error shape returned by API routes */
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Single GIF entry in dashboard list */
export const dashboardGifSchema = z.object({
  url: z.string().url(),
  createdAt: z.number(),
  presentationId: z.string().optional(),
  presentationTitle: z.string().optional(),
});
/** GET /api/stats response */
export const dashboardStatsSchema = z.object({
  gifsCreated: z.number(),
  presentationsLoaded: z.number(),
  totalSlidesProcessed: z.number(),
  gifs: z.array(dashboardGifSchema),
});
export type DashboardGif = z.infer<typeof dashboardGifSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

/** DELETE /api/gifs body */
export const gifDeleteBodySchema = z.object({
  gifUrl: z.string().url(),
});
/** DELETE /api/gifs success response */
export const gifDeleteResponseSchema = z.object({
  ok: z.literal(true),
});
/** POST /api/gifs/rename body */
export const gifRenameBodySchema = z.object({
  gifUrl: z.string().url(),
  presentationTitle: z.string(),
});
/** POST /api/gifs/rename success response */
export const gifRenameResponseSchema = z.object({
  ok: z.literal(true),
  presentationTitle: z.string(),
});
export type GifRenameBody = z.infer<typeof gifRenameBodySchema>;
export type GifRenameResponse = z.infer<typeof gifRenameResponseSchema>;
export const thumbnailSizeSchema = z.enum(['SMALL', 'MEDIUM', 'LARGE']);
/** POST /api/gifs body */
export const generateGifBodySchema = z.object({
  presentationId: z.string().min(1),
  slideList: z.string().min(1),
  delay: z.number().optional(),
  quality: z.number().optional(),
  repeat: z.number().optional(),
  thumbnailSize: thumbnailSizeSchema.optional(),
});
/** POST /api/gifs success response */
export const generateGifResponseSchema = z.object({
  gifUrl: z.string().url(),
});
export type GifDeleteBody = z.infer<typeof gifDeleteBodySchema>;
export type GifDeleteResponse = z.infer<typeof gifDeleteResponseSchema>;
export type GenerateGifBody = z.infer<typeof generateGifBodySchema>;
export type GenerateGifResponse = z.infer<typeof generateGifResponseSchema>;

/** Auth object when logged in (matches GoogleOAuthData shape) */
export const userAuthSchema = z.object({
  code: z.string(),
  scope: z.string(),
  authDate: z.number(),
});
/** GET /api/users/me response */
export const userResponseSchema = z.object({
  isLoggedIn: z.boolean(),
  auth: userAuthSchema.optional(),
  count: z.number().optional(),
});
export type UserAuth = z.infer<typeof userAuthSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
