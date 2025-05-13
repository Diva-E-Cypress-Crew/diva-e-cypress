import { defineConfig } from 'cypress'
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor'
import createBundler from '@bahmutov/cypress-esbuild-preprocessor'
import allureWriter from '@shelex/cypress-allure-plugin/writer.js'
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild'

export default defineConfig({
  e2e: {
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);

      allureWriter(on, config)

      on('file:preprocessor', createBundler({
        plugins: [createEsbuildPlugin(config)],
      }))

      return config
    },
    baseUrl: 'https://meag.gitlab.diva-e.com/investmentrechner-2023',
    specPattern: 'cypress/e2e/**/*.feature',
  },
  env: {
    allure: true,
    enableScreenshotDiffPlugin: true
  },
  viewportHeight: 800,
  viewportWidth: 1400,
  watchForFileChanges: false,
  defaultCommandTimeout: 15000,
  trashAssetsBeforeRuns: true,
  screenshotOnRunFailure: true,
  video: false,
  screenshotsFolder: './cypress/snapshots/actual',
})
