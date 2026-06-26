type RiskScale = "very_low" | "low" | "medium" | "high" | "very_high";
type RiskLevel = "low" | "moderate" | "high" | "critical";

const riskScaleValue: Record<RiskScale, number> = {
  very_low: 1,
  low: 2,
  medium: 3,
  high: 4,
  very_high: 5,
};

export function computeRiskLevel(probability: RiskScale, severity: RiskScale): RiskLevel {
  const score = riskScaleValue[probability] * riskScaleValue[severity];
  if (score <= 4) return "low";
  if (score <= 9) return "moderate";
  if (score <= 16) return "high";
  return "critical";
}
