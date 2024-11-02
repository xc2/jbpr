![image](https://github.com/user-attachments/assets/37ba3467-fe39-44ed-8693-f8989e866607)

This tool acts as a webserver to proxy specific JetBrains Plugin Repositories, eliminating IDE version constraints. 

This allows you to install the latest versions of specific plugins, even if they are not officially compatible with your IDE version.

## Usage

### Run the server

#### Deno

```shell
deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write https://unpkg.com/jbpr@latest/deno.mjs
```

#### Bun

```shell
bunx --bun jbpr@latest
```

#### Node.js

##### npm

```shell title="npm"
npx jbpr@latest
```

##### pnpm

```shell title="pnpm"
pnpx jbpr@latest
```

##### yarn

```shell title="yarn"
yarn dlx jbpr@latest
```

This will start a server at `http://localhost:8686`.

### Configure your IDE

Next, you can [add the repository URL](https://www.jetbrains.com/help/idea/managing-plugins.html#repos) of a plugin to your IDE. The repository URL is of format:

```
http://127.0.0.1:8686/plugins/:id
```

For example:

```
http://127.0.0.1:8686/plugins/7083
```

![image](https://github.com/user-attachments/assets/e0f91275-ad77-4877-b3fe-d5d422c0399b)

Now you are able to install the plugin of id `7083` (Erlang) in the IDE plugin marketplace.

![image](https://github.com/user-attachments/assets/15403fb5-b1c2-48a1-9ea9-20a20cc44fff)
