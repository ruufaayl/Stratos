/**
 * AWS EC2 on-demand hourly prices — TypeScript mirror of engine/catalog.py.
 * Prices: USD/hr, us-east-1, Linux, January 2026 reference.
 *
 * ARCHITECTURE LAW: These values feed Python engine input only.
 *                   The engine owns all dollar arithmetic.
 */

export const PRICING: Record<string, number> = {
  // Burstable
  "t3.nano":    0.0052,
  "t3.micro":   0.0104,
  "t3.small":   0.0208,
  "t3.medium":  0.0416,
  "t3.large":   0.0832,
  "t3.xlarge":  0.1664,
  "t3.2xlarge": 0.3328,
  // General purpose
  "m5.large":    0.096,
  "m5.xlarge":   0.192,
  "m5.2xlarge":  0.384,
  "m5.4xlarge":  0.768,
  "m5.8xlarge":  1.536,
  // Compute optimized
  "c5.large":    0.085,
  "c5.xlarge":   0.170,
  "c5.2xlarge":  0.340,
  "c5.4xlarge":  0.680,
  // Memory optimized
  "r5.large":    0.126,
  "r5.xlarge":   0.252,
  "r5.2xlarge":  0.504,
};

/** Fallback price for instance types not in the catalog (m5.large rate). */
export const DEFAULT_HOURLY_USD = 0.096;

/**
 * Returns the hourly on-demand price for an instance type,
 * falling back to DEFAULT_HOURLY_USD if the type isn't in the catalog.
 */
export function priceForType(instanceType: string): number {
  return PRICING[instanceType] ?? DEFAULT_HOURLY_USD;
}
