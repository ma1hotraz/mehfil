/** Indexed read that fails loudly: under `noUncheckedIndexedAccess` a miss is a programmer error. */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(`No item at index ${index}`);
  }
  return item;
}
