import { z } from "zod";

export const createItemSchema = z.object({
  assetTag: z
    .string({ required_error: "assetTag is required" })
    .trim()
    .min(1, "assetTag cannot be empty")
    .max(30, "assetTag cannot exceed 30 characters"),
  name: z
    .string({ required_error: "name is required" })
    .trim()
    .min(1, "name cannot be empty")
    .max(100, "name cannot exceed 100 characters"),
  description: z.string().max(1000, "description cannot exceed 1000 characters").optional().default(""),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
