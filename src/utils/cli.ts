import { RepositoryPath } from "../paths";

export function normalizeArgs(_args: unknown, exit: (code: number) => any) {
  const args = _args as any;
  if (args.help === true || args.h === true) {
    console.error(`OPTIONS:

--help, -h: Show this help message
--hostname <hostname>, -H <hostname>: Hostname to bind to
--port <port>, -p <port>: Port to bind to
`);
    exit(1);
    throw new Error("unreachable");
  }

  const hostname = `${args.hostname || args.H || "localhost"}`;
  const port = Number(args.port || args.p || 8686);
  return { hostname, port };
}

export function getUsageMessage({
  hostname,
  port,
  origin,
}: { hostname?: string; port?: number; origin?: string }) {
  if (hostname && ["127.0.0.1", "127.1", "::1"].includes(hostname)) {
    hostname = "localhost";
  }
  origin = origin || `http://${hostname!.includes(":") ? `[${hostname}]` : hostname}:${port}`;
  const u = new URL(RepositoryPath, origin);

  return `Service is listening on ${u.origin}
  
REPOSITORY URL:

${u.href} (Replace :id with the plugin ID)

EXAMPLE:

${u.href.replace(/:id/, "17718")}
  
You can now add this repository to your IDE.`;
}
