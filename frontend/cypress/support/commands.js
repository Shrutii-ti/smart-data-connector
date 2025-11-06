// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to validate download
Cypress.Commands.add('validateDownload', (fileName) => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  cy.readFile(`${downloadsFolder}/${fileName}`).should('exist');
});

// Custom command to clear downloads folder
Cypress.Commands.add('clearDownloads', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');
  cy.task('clearDownloads', downloadsFolder);
});
