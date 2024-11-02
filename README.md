This server proxies a specific JetBrains Plugin Repository to remove IDE version constraints.

So that you can install the latest version of specific plugins even if they are not officially compatible with your IDE version.

## Features

- This project works as a http server that behaves as a Jetbrains Plugin Repository
- The server remove version constraints of plugins from the plugin repository and the plugin bundle

## Usage

### Run the server

#### Deno

```shell
deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write https://unpkg.com/jbpr@latest/index.mjs
```

#### Bun

```shell
bunx --bun jbpr@latest
```

#### Node.js

```shell title="npm"
npx jbpr@latest
```

```shell title="pnpm"
pnpx jbpr@latest
```

```shell title="yarn"
yarn dlx jbpr@latest
```

Which will start a server at `http://localhost:8686`

### Configure your IDE

Then you could [add the repository url](https://www.jetbrains.com/help/idea/managing-plugins.html#repos) of a plugin to your IDE, for example:

```
http://127.0.0.1:8686/plugins/17718
```

Now you are able to install the plugin of id `17718` (GitHub Copilot) in the IDE plugin marketplace.