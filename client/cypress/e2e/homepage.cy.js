// Mock Firebase before visiting the page
beforeEach(() => {
  cy.window().then((win) => {
    // If your app uses firebase.initializeApp()
    win.firebase = {
      initializeApp: () => ({
        auth: () => ({
          signInWithEmailAndPassword: () => Promise.resolve({ user: {} })
        }),
        firestore: () => ({
          collection: () => ({
            get: () => Promise.resolve({ docs: [] })
          })
        })
      })
    }
  })

  // Prevent uncaught exceptions from failing tests
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false
  })
})

describe('Homepage', () => {
  it('should load and display the Home link', () => {
    cy.visit('http://localhost:5173') // your dev server

    // Verify the Home link exists and is visible
    cy.contains('a', 'Home')
      .should('be.visible')
      .and('have.attr', 'href', '/home')
  })
})
