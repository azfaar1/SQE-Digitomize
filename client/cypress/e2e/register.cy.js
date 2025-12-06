// // Mock Firebase before visiting the page
// beforeEach(() => {
//   cy.window().then((win) => {
//     win.firebase = {
//       initializeApp: () => ({
//         auth: () => ({
//           createUserWithEmailAndPassword: (email, password) =>
//             Promise.resolve({ user: { email } })
//         }),
//         firestore: () => ({
//           collection: () => ({
//             doc: () => ({
//               set: () => Promise.resolve()
//             })
//           })
//         })
//       })
//     }
//   })

//   // Prevent uncaught exceptions from failing tests
//   Cypress.on('uncaught:exception', () => false)
// })

// describe('User Registration', () => {
//   it('should register a new user successfully', () => {
//     // 1️⃣ Visit the homepage
//     cy.visit('http://localhost:5173')

//     // 2️⃣ Click "Register Now" button
//     cy.contains('button', 'Register Now').click()

//     // 3️⃣ Fill registration form
//     cy.get('input[placeholder="your name"]').type('azfaar')
//     cy.get('input[placeholder="username"]').type('azfaar16')
//     cy.get('input[placeholder="you@email.com"]').type('azfaars16@gmail.com')
//     cy.get('input[placeholder="***************"]').type('12345678')

//     // 4️⃣ Click "Join the coders" button
//     cy.contains('span', 'Join the coders').click()

//     // 5️⃣ Confirm registration success by checking logo is visible
//     cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
//       .should('be.visible')
//   })
// })
beforeEach(() => {
  cy.visit("https://digitomize.com/signup");
});

it("TC-02: Register with duplicate email", () => {
  cy.get('input[placeholder="your name"]').type("testuser");
  cy.get('input[placeholder="username"]').type("testuser123");
  cy.get('input[placeholder="you@mail.com"]').type("azfaars12@gmail.com"); // existing email
  cy.get('input[placeholder="***************"]').type("salahudin1{enter}");

  cy.contains("h3", "auth/email-already-in-use").should("be.visible");
});

it("TC-03: Register with weak password", () => {
  cy.get('input[placeholder="your name"]').type("weak");
  cy.get('input[placeholder="username"]').type("weak123");
  cy.get('input[placeholder="you@mail.com"]').type("weakpass@gmail.com");
  cy.get('input[placeholder="***************"]').type("123{enter}"); // weak

  cy.contains("h3", "auth/weak-password").should("be.visible");
});

function staysOnSignup() {
  cy.url().should("eq", "https://digitomize.com/signup");
}

it("TC-04: Empty name field", () => {
  cy.get('input[placeholder="username"]').type("user123");
  cy.get('input[placeholder="you@mail.com"]').type("u123@gmail.com");
  cy.get('input[placeholder="***************"]').type("salahudin1{enter}");

  staysOnSignup();
});

it("TC-05: Empty username field", () => {
  cy.get('input[placeholder="your name"]').type("test");
  cy.get('input[placeholder="you@mail.com"]').type("u123@gmail.com");
  cy.get('input[placeholder="***************"]').type("salahudin1{enter}");

  staysOnSignup();
});

it("TC-06: Empty email field", () => {
  cy.get('input[placeholder="your name"]').type("test");
  cy.get('input[placeholder="username"]').type("user123");
  cy.get('input[placeholder="***************"]').type("salahudin1{enter}");

  staysOnSignup();
});

it("TC-07: Empty password field", () => {
  cy.get('input[placeholder="your name"]').type("test");
  cy.get('input[placeholder="username"]').type("user123");
  cy.get('input[placeholder="you@mail.com"]').type("u@gmail.com");

  cy.get('input[placeholder="***************"]').type("{enter}");

  staysOnSignup();
});

it("TC-01: Register with valid inputs", () => {
  cy.get('input[placeholder="your name"]').type("azfaar");
  cy.get('input[placeholder="username"]').type("azfaar12");
  cy.get('input[placeholder="you@mail.com"]').type("azfaars15@gmail.com");
  cy.get('input[placeholder="***************"]').type("salahudin1{enter}");

  cy.get('a[href="/u/dashboard"] img[alt="logo"]', { timeout: 20000 })
    .should("be.visible");
});