export function copyHeader(source: Headers, dest: Headers, name: string, defaults?: string) {
  if (source.has(name)) {
    dest.set(name, source.get(name)!);
  } else if (defaults) {
    dest.set(name, defaults);
  }
}

export function copyResponse(body: BodyInit | null, res: Response) {
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
