describe('Edit Profile Flow', () => {
  it('should update bio and skills successfully', () => {

    // Go to login page
    cy.visit('https://digitomize.com/login', { timeout: 20000 });

    // Login
    cy.get('input[type="email"]', { timeout: 20000 })
      .type('azfaars12@gmail.com');

    cy.get('input[type="password"]', { timeout: 20000 })
      .type('salahudin1');

    // Press Enter to log in
    cy.get('input[placeholder="***************"]', { timeout: 20000 })
      .type('{enter}');

    // Verify dashboard avatar visible (login success)
    cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
      .should('be.visible');

    // Click profile
    cy.get('a[href="/u/dashboard/profile"]', { timeout: 20000 })
      .first().click();

    // Type random bio
    cy.get('textarea[name="bio"]', { timeout: 20000 })
      .clear()
      .type('This is a Cypress test bio update.');

    cy.contains('button', 'Save changes', { timeout: 20000 })
    .click();

    cy.get('button.lg\\:hidden', { timeout: 20000 }).click();

    // Click "career" section
    cy.contains('button', 'career', { timeout: 20000 })
      .click();

    // Type skill "Node.js"
    cy.get('input[name="skills"]', { timeout: 20000 })
      .clear()
      .type('Node.js');

    // Click "Add"
    cy.contains('button', 'Add', { timeout: 20000 })
      .click();

    // Click "Save changes"
    cy.contains('button', 'Save changes', { timeout: 20000 })
      .click();

    // Optional: Wait for backend to update
    cy.wait(20000);

  });
});
