describe('Login Tests - Minimal Test Set', () => {
  beforeEach(() => {
    cy.visit('https://digitomize.com/login')
  })

  // TC-01
  it('TC-01: Login with incorrect email', () => {
    cy.get('input[type="email"]').type('wrong@gmail.com')
    cy.get('input[type="password"]').type('salahudin1')

    cy.get('input[placeholder="***************"]').type('{enter}')

    cy.contains('auth/invalid-login-credentials', { timeout: 10000 });
  })

  // TC-02
  it('TC-02: Login with incorrect password', () => {
    cy.get('input[type="email"]').type('azfaars12@gmail.com')
    cy.get('input[type="password"]').type('wrongpass')

    cy.get('input[placeholder="***************"]').type('{enter}')

    cy.contains('auth/invalid-login-credentials', { timeout: 10000 });
  })

  // TC-03
  it('TC-03: Login with empty fields', () => {
    cy.get('input[placeholder="***************"]').type('{enter}')

    cy.url().should('eq', 'https://digitomize.com/login');
  })

  // TC-04
  it('TC-04: Login with email only', () => {
    cy.get('input[type="email"]').type('azfaars12@gmail.com')

    cy.get('input[placeholder="***************"]').type('{enter}')

    cy.url().should('eq', 'https://digitomize.com/login');

  })

    // TC-05
  it('TC-05: Login with correct credentials', () => {
    cy.get('input[type="email"]').type('azfaars12@gmail.com')
    cy.get('input[type="password"]').type('salahudin1')

    cy.get('input[placeholder="***************"]').type('{enter}')

    cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
      .should('be.visible')
  })
})