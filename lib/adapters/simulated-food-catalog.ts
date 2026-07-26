export const SIMULATED_DELIVERY_FEE_RUPEES = 25;

const SIMULATED_PRICES_RUPEES: Readonly<Record<string, number>> = Object.freeze({
  'masala dosa': 120,
  'plain dosa': 100,
  'paper dosa': 90,
  'set dosa': 110,
});

export function simulatedFoodItemPriceRupees(name: string): number {
  return SIMULATED_PRICES_RUPEES[name.toLowerCase()] ?? 100;
}

export function simulatedFoodTotalRupees(name: string): number {
  return simulatedFoodItemPriceRupees(name) + SIMULATED_DELIVERY_FEE_RUPEES;
}
