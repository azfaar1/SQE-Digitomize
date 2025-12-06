describe('Blog Access flow', () => {

  it('Logs in and accesses blogs', () => {

    // Visit login page
    cy.visit('https://digitomize.com/login');
    cy.get('input[type="email"]').type('azfaars12@gmail.com', { delay: 50 });
    cy.get('input[type="password"]').type('salahudin1', { delay: 50 });
    cy.get('input[placeholder="***************"]').type('{enter}');
    cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
      .should('be.visible');

    // Go to Blog
    // cy.visit('https://blogs.digitomize.com/', { timeout: 20000 });

  });

});