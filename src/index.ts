import { createApp } from "./app";
import { config } from "./lib/config";

const app = createApp();

app.listen(config.port, () => {
  console.log(`[api] Clipper backend listening on :${config.port}`);
  console.log(`[api] data dir: ${config.dataDir}`);
  console.log(`[api] auth stub: ${config.authStub}`);
});
