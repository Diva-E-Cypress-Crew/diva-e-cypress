import { defineConfig } from "cypress";

/**
 * Zentrale Cypress-Konfiguration.
 *
 * Projektabhängig wichtig:
 * - `baseUrl`: Wird von deinem Tooling (switchUrl) per Regex ersetzt,
 *   wenn die erste Feature-Zeile `# url: https://...` enthält.
 * - `setupNodeEvents`: Platz für Event-Hooks/Reporter etc.
 */
export default defineConfig({
  e2e: {
    // ⚠️ Optional: Standard-URL, die von `switchUrl` überschrieben werden kann.
    // Lass die Zeile drin (oder auskommentiert), damit `switchUrl` etwas ersetzen kann.
    // baseUrl: "https://example.org/",

    setupNodeEvents(on, config) {
      // Node-Event-Listener, z. B.:
      // - On 'task' handlers
      // - Reporter initialisieren
      // - Screenshot/Video-Hooks
      //
      // Beispiel:
      // on('task', { log: (m) => { console.log(m); return null; } });
      return config;
    },
  },

  // 🔎 Nützlich, wenn Tests langsamer sind:
  // defaultCommandTimeout: 10000,
  // pageLoadTimeout: 60000,
});
