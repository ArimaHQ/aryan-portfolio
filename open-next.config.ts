import { defineCloudflareConfig, type OpenNextConfig } from '@opennextjs/cloudflare';

// The app is currently statically generated, so no incremental-cache binding is
// provisioned. Add one only when a future route actually needs ISR or cache tags.
// Keep the default `npm run build` compatible with Workers Builds: the adapter
// invokes this underlying Next build rather than recursively calling itself.
const config: OpenNextConfig = defineCloudflareConfig();
config.buildCommand = 'npm run build:next';

export default config;
