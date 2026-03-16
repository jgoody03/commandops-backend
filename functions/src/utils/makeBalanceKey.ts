export function makeBalanceKey(locationId: string, productId: string): string {
  return `${locationId}_${productId}`;
}