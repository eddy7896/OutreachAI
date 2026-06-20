const { Resend } = require('resend');
const resend = new Resend('re_test123');
console.log(Object.keys(resend.emails));
console.log(resend.emails.receiving ? 'has receiving' : 'no receiving');
