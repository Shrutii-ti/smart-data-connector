import { defineConfig } from 'cypress';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.spec.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    setupNodeEvents(on, config) {
      // Task to clear downloads folder
      on('task', {
        clearDownloads(downloadsFolder) {
          if (fs.existsSync(downloadsFolder)) {
            const files = fs.readdirSync(downloadsFolder);
            files.forEach(file => {
              const filePath = path.join(downloadsFolder, file);
              fs.unlinkSync(filePath);
            });
          }
          return null;
        },
      });

      return config;
    },
  },
});
