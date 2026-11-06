import { z } from "zod";

export const createRequestSchema = z.object({
  itemId: z.string({ required_error: "itemId is required" }).uuid("itemId must be a valid UUID"),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
