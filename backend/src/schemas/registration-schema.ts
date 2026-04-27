import { z } from "zod";

const troopTypeSchema = z.enum(["infantry", "lancer", "marksman"]);

const troopLoadoutEntrySchema = z.object({
  type: troopTypeSchema,
  tier: z.coerce.number().int().min(7, "Troop tier must be 7 or higher.").max(11, "Troop tier must be 11 or lower."),
  count: z.coerce.number().int().min(1, "Troop count must be at least 1.").max(100000000)
});

export const registrationSchema = z.object({
  nickname: z.string().trim().min(2, "Nickname is required.").max(40),
  partnerNames: z
    .array(z.string().trim().min(2, "Partner name is required.").max(40))
    .min(1, "At least one partner is required.")
    .max(4, "Use up to 4 regular partners.")
    .transform((names) => {
      const uniqueNames: string[] = [];

      names.forEach((name) => {
        if (!uniqueNames.some((existingName) => existingName.toLowerCase() === name.toLowerCase())) {
          uniqueNames.push(name);
        }
      });

      return uniqueNames;
    }),
  troopLoadout: z
    .array(troopLoadoutEntrySchema)
    .min(1, "At least one troop line is required.")
    .max(6, "Only your strongest 2 troop tiers should be counted.")
    .superRefine((entries, context) => {
      const combinations = new Set<string>();
      const tiers = new Set<number>();

      entries.forEach((entry, index) => {
        const key = `${entry.type}:${entry.tier}`;

        if (combinations.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate troop type and tier combinations are not allowed.",
            path: [index, "tier"]
          });
        }

        combinations.add(key);
        tiers.add(entry.tier);
      });

      if (tiers.size > 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only your strongest 2 troop tiers should be counted.",
          path: []
        });
      }
    }),
  personalScore: z
    .coerce
    .number()
    .int("Personal score must be a whole number.")
    .min(0, "Personal score must be 0 or higher.")
    .max(1000000000, "Personal score is unrealistically high.")
    .nullable()
    .optional()
    .transform((value) => (typeof value === "number" ? value : null)),
  comment: z
    .string()
    .trim()
    .max(300, "Comment is too long.")
    .optional()
    .transform((value) => (value ? value : null)),
  isAvailable: z.boolean()
});
