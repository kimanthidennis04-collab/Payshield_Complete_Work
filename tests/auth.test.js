const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server/index');

const prisma = new PrismaClient();

describe('Authentication', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test.db')) {
      throw new Error('Refusing to run destructive test against non-test database! Set DATABASE_URL to test.db');
    }
    await prisma.$connect();
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user and organization', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'password123',
          businessName: 'Test Business',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBeDefined();
      expect(response.body.organization.name).toBe('Test Business');
    });

    it('should not allow duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: email,
          password: 'password123',
          businessName: 'Test Business',
        });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Another User',
          email: email,
          password: 'password456',
          businessName: 'Another Business',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email already registered');
    });

    it('should require required fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;

      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: email,
          password: 'password123',
          businessName: 'Test Business',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: email,
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `nonexistent-${Date.now()}@example.com`,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data with valid token', async () => {
      const email = `me-${Date.now()}@example.com`;

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: email,
          password: 'password123',
          businessName: 'Test Business',
        });

      const token = signupResponse.body.token;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
