// cypress.config.ts

import { defineConfig } from 'cypress';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import allureWriter from '@shelex/cypress-allure-plugin/writer';

export default defineConfig({
  e2e: {
    // 1) Wo liegen eure .feature-Files?
    specPattern: 'cypress/e2e/**/*.feature',

    // 2) Wo sucht Cucumber nach Step-Definitionen?
    //    Hier absolut korrekt auf das Verzeichnis verweisen,
    //    in dem unser Runner die ollama_steps.ts ablegt:
    stepDefinitions: ['cypress/e2e/common/steps/**/*.ts'],
    
    // 3) Eure Ziel-URL:
    baseUrl: 'https://meag.gitlab.diva-e.com/investmentrechner-2023',

    async setupNodeEvents(on, config) {
      // 1) Cucumber-Preprocessor registrieren
      await addCucumberPreprocessorPlugin(on, config);

      // 2) Allure-Reporter aktivieren
      allureWriter(on, config);

      // 3) Esbuild-Bundler für TS-Schritte konfigurieren
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );

      return config;
    },
  },

  env: {
    allure: true,
    enableScreenshotDiffPlugin: true,
  },

  viewportHeight: 800,
  viewportWidth: 1400,
  watchForFileChanges: false,
  defaultCommandTimeout: 15000,
  trashAssetsBeforeRuns: true,
  screenshotOnRunFailure: true,
  video: false,
  screenshotsFolder: './cypress/snapshots/actual',
});
