import { z } from "zod";

export type EyeKey = "rightEye" | "leftEye";

export type ValidationSettings = {
  sph: { min: number; max: number; step: number };
  cyl: { min: number; max: number; step: number };
  axis: { min: number; max: number };
};

export const DEFAULT_SETTINGS: ValidationSettings = {
  // Broad illustrative defaults only. Configure these for your lab/product standard.
  sph: { min: -20, max: 20, step: 0.25 },
  cyl: { min: -10, max: 10, step: 0.25 },
  axis: { min: 1, max: 180 }
};

const settingsSchema = z.object({
  sph: z.object({ min: z.number().finite(), max: z.number().finite(), step: z.number().positive().finite() }),
  cyl: z.object({ min: z.number().finite(), max: z.number().finite(), step: z.number().positive().finite() }),
  axis: z.object({ min: z.number().finite(), max: z.number().finite() })
}).superRefine((settings, ctx) => {
  for (const key of ["sph", "cyl"] as const) {
    if (settings[key].min >= settings[key].max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, "min"], message: `${key.toUpperCase()} minimum must be less than its maximum.` });
    }
    if (settings[key].step <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key, "step"], message: `${key.toUpperCase()} step must be greater than zero.` });
    }
  }
  if (settings.axis.min < 1 || settings.axis.max > 180 || settings.axis.min >= settings.axis.max) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["axis"], message: "Axis settings must be within 1°–180°, with minimum below maximum." });
  }
});

const eyeInputSchema = z.object({
  sph: z.union([z.number().finite(), z.literal("")]).optional(),
  cyl: z.union([z.number().finite(), z.literal("")]).optional(),
  axis: z.union([z.number().finite(), z.literal("")]).optional()
});

export type EyeInput = { sph: number | ""; cyl: number | ""; axis: number | "" };
export type PrescriptionInput = { rightEye: EyeInput; leftEye: EyeInput };

export type FieldError = {
  field: string;
  code: string;
  message: string;
};

function isOnStep(value: number, min: number, step: number): boolean {
  const units = (value - min) / step;
  return Math.abs(units - Math.round(units)) < 1e-7;
}

function formatDiopters(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)} D`;
}

export function validatePrescription(input: unknown, settingsInput: unknown = DEFAULT_SETTINGS) {
  const errors: FieldError[] = [];
  const parsedSettings = settingsSchema.safeParse(settingsInput);
  if (!parsedSettings.success) {
    return {
      valid: false,
      errors: parsedSettings.error.issues.map((issue) => ({
        field: `settings.${issue.path.join(".")}`,
        code: "INVALID_SETTINGS",
        message: issue.message
      })),
      values: null
    };
  }
  const settings = parsedSettings.data;

  const parsed = z.object({
    rightEye: eyeInputSchema,
    leftEye: eyeInputSchema
  }).safeParse(input);

  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join(".") || "prescription",
        code: "INVALID_TYPE",
        message: `Invalid value for ${issue.path.join(".") || "prescription"}. Use a number or leave the field empty.`
      })),
      values: null
    };
  }

  const values = parsed.data;
  for (const eyeKey of ["rightEye", "leftEye"] as const) {
    const eye = values[eyeKey];
    const label = eyeKey === "rightEye" ? "Right eye" : "Left eye";

    for (const field of ["sph", "cyl"] as const) {
      const value = eye[field];
      const rule = settings[field];
      const fieldName = `${eyeKey}.${field}`;
      const fieldLabel = `${label} ${field.toUpperCase()}`;

      if (value === undefined || value === "") {
        errors.push({ field: fieldName, code: "REQUIRED", message: `${fieldLabel} is required.` });
        continue;
      }
      if (value < rule.min || value > rule.max) {
        errors.push({
          field: fieldName,
          code: "OUT_OF_RANGE",
          message: `${fieldLabel} must be between ${formatDiopters(rule.min)} and ${formatDiopters(rule.max)}.`
        });
      } else if (!isOnStep(value, rule.min, rule.step)) {
        errors.push({
          field: fieldName,
          code: "INVALID_INCREMENT",
          message: `${fieldLabel} must follow ${rule.step} D increments, starting from ${formatDiopters(rule.min)}.`
        });
      }
    }

    const cyl = eye.cyl;
    const axis = eye.axis;
    const axisField = `${eyeKey}.axis`;

    if (cyl !== undefined && cyl !== "" && cyl !== 0 && (axis === undefined || axis === "")) {
      errors.push({
        field: axisField,
        code: "REQUIRED",
        message: `${label} Axis is required when CYL is non-zero.`
      });
    } else if (axis !== undefined && axis !== "") {
      if (!Number.isInteger(axis)) {
        errors.push({ field: axisField, code: "INVALID_INTEGER", message: `${label} Axis must be a whole number of degrees.` });
      } else if (axis < settings.axis.min || axis > settings.axis.max) {
        errors.push({
          field: axisField,
          code: "OUT_OF_RANGE",
          message: `${label} Axis must be between ${settings.axis.min}° and ${settings.axis.max}°.`
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    values: errors.length === 0 ? values : null
  };
}
