export function qs(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value as string | undefined;
}