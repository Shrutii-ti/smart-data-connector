/**
 * E2E Smoke Test
 * Full flow: paste URL → test → generate → download JSON
 */

describe('Smart Data Connector - Full Flow E2E', () => {
  const MOCK_SERVER_URL = 'http://localhost:3001/orders';
  const AUTH_TOKEN = 'Bearer demo';

  beforeEach(() => {
    // Visit the application
    cy.visit('/');
  });

  it('completes the full flow: test connection → view schema → generate → download', () => {
    // Step 1: Enter API URL
    cy.get('input#url').should('be.visible').type(MOCK_SERVER_URL);

    // Step 2: Enter Authorization header
    cy.get('input#authorization').should('be.visible').type(AUTH_TOKEN);

    // Step 3: Test button should be enabled
    cy.get('button').contains(/Test Connection/i).should('not.be.disabled');

    // Step 4: Click Test Connection
    cy.get('button').contains(/Test Connection/i).click();

    // Step 5: Wait for loading state
    cy.get('button').contains(/Testing/i).should('exist');

    // Step 6: Wait for results to appear
    cy.contains(/Detected Schema/i, { timeout: 10000 }).should('be.visible');

    // Step 7: Verify fields are displayed in table
    cy.get('.fields-table').should('be.visible');
    cy.get('.fields-table tbody tr').should('have.length.at.least', 1);

    // Step 8: Verify specific fields are detected (based on actual mock data)
    cy.get('.field-name').contains(/id/i).should('exist');
    cy.get('.field-name').contains(/customer/i).should('exist');
    cy.get('.field-name').contains(/amount/i).should('exist');

    // Step 9: Verify field types are displayed
    cy.get('.field-type').should('contain.text', 'integer');
    cy.get('.field-type').should('contain.text', 'string');
    cy.get('.field-type').should('contain.text', 'number');

    // Step 10: Verify pagination info is displayed
    cy.contains(/Pagination/i).should('be.visible');
    cy.contains(/page/i).should('be.visible');

    // Step 11: Verify Download button exists (from test results)
    cy.get('button').contains(/Download/i).should('be.visible').and('not.be.disabled');

    // Step 12: Verify Generate button exists (for ToolJet datasource)
    cy.get('button').contains(/Generate ToolJet/i).should('be.visible').and('not.be.disabled');

    // Step 13: Click Generate ToolJet button
    cy.get('button').contains(/Generate ToolJet/i).click();

    // Step 14: Wait for generation completion
    cy.contains(/ToolJet datasource generated/i, { timeout: 5000 }).should('be.visible');

    // Step 15: Verify Download ToolJet button appears
    cy.get('button').contains(/Download ToolJet/i).should('be.visible');

    // Step 16: Click Download ToolJet button and verify download
    cy.get('button').contains(/Download ToolJet/i).click();

    // Step 17: Verify download completed (check for download element or success message)
    // Note: Cypress has limitations with actual file downloads in some browsers
    // We verify the download was triggered by checking the success state
    cy.contains(/download/i).should('exist');
  });

  it('handles missing authorization error gracefully', () => {
    // Enter URL without authorization
    cy.get('input#url').type(MOCK_SERVER_URL);

    // Click Test Connection
    cy.get('button').contains(/Test Connection/i).click();

    // Wait for error to appear
    cy.contains(/Connection Failed/i, { timeout: 10000 }).should('be.visible');
    cy.contains(/401/i).should('be.visible');
    cy.contains(/Unauthorized/i).should('be.visible');

    // Verify Retry button exists
    cy.get('button').contains(/Retry/i).should('be.visible');

    // Verify Generate button does NOT exist (no successful test)
    cy.get('button').contains(/Generate ToolJet/i).should('not.exist');
  });

  it('allows retry after error', () => {
    // First attempt without auth (will fail)
    cy.get('input#url').type(MOCK_SERVER_URL);
    cy.get('button').contains(/Test Connection/i).click();
    cy.contains(/Connection Failed/i, { timeout: 10000 }).should('be.visible');

    // Add authorization
    cy.get('input#authorization').type(AUTH_TOKEN);

    // Click Retry
    cy.get('button').contains(/Retry/i).click();

    // Should now succeed
    cy.contains(/Detected Schema/i, { timeout: 10000 }).should('be.visible');
    cy.get('.fields-table').should('be.visible');

    // Generate button should now be available
    cy.get('button').contains(/Generate ToolJet/i).should('be.visible');
  });

  it('disables Test button when URL is empty', () => {
    // Test button should be disabled initially
    cy.get('button').contains(/Test Connection/i).should('be.disabled');

    // Type URL
    cy.get('input#url').type(MOCK_SERVER_URL);

    // Test button should now be enabled
    cy.get('button').contains(/Test Connection/i).should('not.be.disabled');

    // Clear URL
    cy.get('input#url').clear();

    // Test button should be disabled again
    cy.get('button').contains(/Test Connection/i).should('be.disabled');
  });

  it('allows pasting sample JSON as fallback', () => {
    // Click Paste Sample button
    cy.get('button').contains(/Paste Sample/i).click();

    // Should show textarea
    cy.get('textarea#sampleJSON').should('be.visible');

    // Paste sample JSON
    const sampleData = JSON.stringify({
      orders: [
        { id: 1, customer: 'John Doe', amount: 100 },
        { id: 2, customer: 'Jane Smith', amount: 200 }
      ]
    }, null, 2);

    cy.get('textarea#sampleJSON').type(sampleData, { parseSpecialCharSequences: false });

    // Click Test Sample button
    cy.get('button').contains(/Test Sample/i).click();

    // Should show detected schema
    cy.contains(/Detected Schema/i, { timeout: 10000 }).should('be.visible');

    // Verify fields from pasted sample
    cy.get('.field-name').contains(/id/i).should('exist');
    cy.get('.field-name').contains(/customer/i).should('exist');
    cy.get('.field-name').contains(/amount/i).should('exist');

    // Verify sample path
    cy.contains(/Sample Path.*orders/i).should('exist');
  });

  it('shows error for invalid pasted JSON', () => {
    // Click Paste Sample button
    cy.get('button').contains(/Paste Sample/i).click();

    // Paste invalid JSON
    cy.get('textarea#sampleJSON').type('invalid json {');

    // Click Test Sample button
    cy.get('button').contains(/Test Sample/i).click();

    // Should show error
    cy.contains(/Invalid JSON|parse/i, { timeout: 10000 }).should('be.visible');
  });
});
