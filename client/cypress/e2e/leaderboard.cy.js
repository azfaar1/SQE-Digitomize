describe('Leaderboard Search Flow', () => {

  it('logs in and searches on leaderboard', () => {

    // Visit login page
    cy.visit('https://digitomize.com/login');
    cy.get('input[type="email"]').type('azfaars12@gmail.com', { delay: 50 });
    cy.get('input[type="password"]').type('salahudin1', { delay: 50 });
    cy.get('input[placeholder="***************"]').type('{enter}');
    cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
      .should('be.visible');

    // Go to Leaderboard
    cy.visit('https://digitomize.com/u/leaderboard', { timeout: 20000 });

    // Type into search input
    cy.get('input[id="filled-search"]').type('abhishek');
    cy.wait(20000);

  });

});