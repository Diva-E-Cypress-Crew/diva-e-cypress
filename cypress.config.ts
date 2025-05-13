const { defineConfig } = require('cypress');
const { addCucumberPreprocessorPlugin } = require('@badeball/cypress-cucumber-preprocessor');
const createBundler = require('@badeball/cypress-cucumber-preprocessor/browserify').default;
const allureWriter = require('@shelex/cypress-allure-plugin/writer');
const path = require('path');

module.exports = defineConfig({
  viewportHeight: 800,
  viewportWidth: 1400,
  watchForFileChanges: false,
  defaultCommandTimeout: 15000,
  trashAssetsBeforeRuns: true,
  screenshotOnRunFailure: true,
  video: false,
  screenshotsFolder: './cypress/snapshots/actual',
  e2e: {
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      await allureWriter(on, config);

      on(
        'file:preprocessor',
        createBundler(config, {
          typescript: require.resolve('typescript'),
        })
      );

      return config;
    },
    // baseUrl: 'https://ronnybetatester.4lima.de/',
    baseUrl: 'https://meag.gitlab.diva-e.com/investmentrechner-2023',
    specPattern: '**/*.{feature,features}',
  },
  env: {
    allure: true,
    enableScreenshotDiffPlugin: true,
  },
});
