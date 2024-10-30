This is a Jetbrains Plugin Repository proxy to remove plugin version constraints.

So that you can use the latest version of plugins even if the plugin is not officially compatible with your IDE version.

## Features

- This project works as a http server that behaves as a Jetbrains Plugin Repository
- The server remove version constraints of plugins from the plugin.xml and plugin's zip bundle

## Usage

### Run the server

```shell
deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write jsr:@109cafe/jbproxy@0.1.0/server
```

Which will start a server at `http://localhost:8686`

Then you could [add the repository url](https://www.jetbrains.com/help/idea/managing-plugins.html#repos) of a plugin to your IDE, for example(Github Copilot as an example):

```
http://127.0.0.1:8686/plugins/17718
```

Then you'll find the plugin in the IDE plugin marketplace to install.