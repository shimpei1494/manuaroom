import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { acceptAiSuggestion } from "../application/usecases/accept-ai-suggestion";
import { listAiSuggestions } from "../application/usecases/list-ai-suggestions";
import { rejectAiSuggestion } from "../application/usecases/reject-ai-suggestion";
import { getDeps } from "../infrastructure/deps";

const ManualIdSchema = z.object({ manualId: z.string().min(1) });
const SuggestionIdSchema = z.object({ suggestionId: z.string().min(1) });

export const listAiSuggestionsFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ManualIdSchema.parse(data))
  .handler(async ({ data }) => {
    return listAiSuggestions(getDeps(), data.manualId);
  });

export const acceptAiSuggestionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SuggestionIdSchema.parse(data))
  .handler(async ({ data }) => {
    return acceptAiSuggestion(getDeps(), data.suggestionId);
  });

export const rejectAiSuggestionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SuggestionIdSchema.parse(data))
  .handler(async ({ data }) => {
    await rejectAiSuggestion(getDeps(), data.suggestionId);
  });
