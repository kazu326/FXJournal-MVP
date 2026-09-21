import { EXPERIMENTAL_PROXY_LABEL, Q1_REASON_CODES, Q2_REASON_CODES } from "./constants.ts";
import { ExperimentError, type JevOutput, type Q1Output, type Q1ReasonCode, type Q2Output, type Q2ReasonCode } from "./types.ts";

function validateOutput<TReason extends string>(
  value: unknown,
  allowedReasons: readonly TReason[],
): JevOutput<TReason> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ExperimentError("JEV_INVALID_OUTPUT", "Jev output must be an object.");
  }
  const record = value as Record<string, unknown>;
  if (record.answer !== "yes" && record.answer !== "no" && record.answer !== "unknown") {
    throw new ExperimentError("JEV_INVALID_OUTPUT", "Jev answer is invalid.");
  }
  if (typeof record.confidence !== "number" || !Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) {
    throw new ExperimentError("JEV_INVALID_OUTPUT", "Jev confidence must be between 0 and 1.");
  }
  if (!Array.isArray(record.reason_codes) || record.reason_codes.some((reason) => typeof reason !== "string" || !allowedReasons.includes(reason as TReason))) {
    throw new ExperimentError("JEV_INVALID_OUTPUT", "Jev reason_codes contain an unsupported value.");
  }
  return {
    proxy_label: EXPERIMENTAL_PROXY_LABEL,
    answer: record.answer,
    confidence: record.confidence,
    reason_codes: record.reason_codes as TReason[],
  };
}

export const validateQ1Output = (value: unknown): Q1Output =>
  validateOutput<Q1ReasonCode>(value, Q1_REASON_CODES);

export const validateQ2Output = (value: unknown): Q2Output =>
  validateOutput<Q2ReasonCode>(value, Q2_REASON_CODES);
