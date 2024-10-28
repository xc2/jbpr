import { configure } from "@zip.js/zip.js";
import { app } from "./app";

configure({
  useCompressionStream: false,
  useWebWorkers: false,
});

export default {
  fetch: (request, env, ctx) => {
    console.log(request.url);
    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;
