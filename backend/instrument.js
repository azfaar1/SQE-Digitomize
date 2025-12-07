// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://4e051fdf3b7a49eb0363420fdfb1ae6e@o4510494319050752.ingest.de.sentry.io/4510494577983568",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});