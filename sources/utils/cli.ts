import { RepositoryPath } from "../paths.ts";

export function normalizeArgs(_args: unknown, exit: (code: number) => any) {
  const args = _args as any;
  if (args.help === true || args.h === true) {
    console.error(`OPTIONS

  --help, -h: Show this help message
  --hostname <hostname>, -H <hostname>: Hostname to bind to
  --port <port>, -p <port>: Port to bind to
  --socket <socket>, -s <socket>: Unix socket to bind to

DEFAULTS

  --hostname 127.0.0.1 --port 8686
`);
    exit(1);
    throw new Error("unreachable");
  }

  const binding = getBinding({
    hostname: args.hostname || args.H,
    port: args.port || args.p,
    socket: args.socket || args.s,
  });

  return { binding };
}

function getBinding({
  hostname,
  port,
  socket,
}: { hostname?: string; port?: number | string; socket?: string }):
  | { unix: string; hostname?: undefined; port?: undefined }
  | { hostname: string; port: number; unix?: undefined } {
  if (socket) {
    return { unix: socket };
  } else {
    hostname = `${hostname || "127.0.0.1"}`;
    port = Number(port || 8686);
    return { hostname, port };
  }
}

export function getUsageMessage({ url }: { url: URL }) {
  const u = new URL(RepositoryPath, url);

  const repository = u.protocol === "unix:" ? "<origin>" + u.pathname : u.href;

  return `Service is listening on

  ${url.href}

REPOSITORY URL

  ${repository} (Replace :id with the plugin ID)

EXAMPLE

  ${repository.replace(/:id/, "17718")}

You can now add this repository to your IDE.
`;
}
