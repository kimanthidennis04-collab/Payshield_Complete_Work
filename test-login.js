const http = require('http');

const email = `test${Date.now()}@payshield.com`;

// First signup
const signupData = JSON.stringify({
  name: 'Test User',
  email: email,
  password: 'password123',
  businessName: 'Test Business'
});

const signupOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(signupData)
  }
};

const signupReq = http.request(signupOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    const token = result.token;
    console.log('Signup Status:', res.statusCode);
    console.log('Token received:', token ? 'Yes' : 'No');

    // Now login
    const loginData = JSON.stringify({
      email: email,
      password: 'password123'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };

    const loginReq = http.request(loginOptions, (res) => {
      let loginData = '';
      res.on('data', (chunk) => { loginData += chunk; });
      res.on('end', () => {
        console.log('Login Status:', res.statusCode);
        console.log('Login Response:', loginData);
      });
    });

    loginReq.on('error', (error) => {
      console.error('Login Error:', error);
    });

    loginReq.write(loginData);
    loginReq.end();
  });
});

signupReq.on('error', (error) => {
  console.error('Signup Error:', error);
});

signupReq.write(signupData);
signupReq.end();
