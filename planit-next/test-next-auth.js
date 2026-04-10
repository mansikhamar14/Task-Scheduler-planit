const NextAuth = require("next-auth");
const NextAuthNext = require("next-auth/next");
console.log("NextAuth type:", typeof NextAuth);
console.log("NextAuth default export:", typeof NextAuth.default);
console.log("NextAuthNext type:", typeof NextAuthNext);
console.log("NextAuthNext default export:", typeof NextAuthNext.default);
