export function resolvePath(
  path: string | string[],
  obj: unknown,
  separator = '.',
): any {
  const properties = Array.isArray(path) ? path : path.split(separator);
  return properties.reduce((prev, curr) => prev?.[curr], obj);
}
