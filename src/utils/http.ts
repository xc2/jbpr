export function copyHeader(source: Headers, dest: Headers, name: string, defaults?: string) {
  if (source.has(name)) {
    dest.set(name, source.get(name)!);
  } else if (defaults) {
    dest.set(name, defaults);
  }
}
