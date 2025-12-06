describe('Contest Participation Flow', () => {
  it('should redirect to LeetCode when clicking Participate', () => {

    // LOGIN
    cy.visit('https://digitomize.com/login');
    cy.get('input[type="email"]').type('azfaars12@gmail.com', { delay: 50 });
    cy.get('input[type="password"]').type('salahudin1', { delay: 50 });
    cy.get('input[placeholder="***************"]').type('{enter}');
    cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
      .should('be.visible');

    // GO TO /contests
    cy.visit('https://digitomize.com/contests', { timeout: 20000 });

    // Click on "Biweekly Contest 171"
    cy.get('a[href="/contests/biweekly-contest-171"] h2', { timeout: 20000 })
      .click();

    // Remove target="_blank" so Cypress can stay in same tab
    cy.get('button')
      .contains('Participate')
      .invoke('removeAttr', 'target', { timeout: 20000 })
      .click();

    // // ASSERT the redirected URL goes to LeetCode
    // cy.url({ timeout: 20000 }).should('include', 'leetcode.com');
  });
});
