const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../server/index');

const prisma = new PrismaClient();

describe('Organization Isolation', () => {
  let org1Token, org2Token, org1Id, org2Id;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('test.db')) {
      throw new Error('Refusing to run destructive test against non-test database! Set DATABASE_URL to test.db');
    }
    await prisma.$connect();
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.invoice.deleteMany({});

    const org1 = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'User 1',
        email: `user1-${Date.now()}@example.com`,
        password: 'password123',
        businessName: 'Organization 1',
      });

    org1Token = org1.body.token;
    org1Id = org1.body.organization.id;

    const org2 = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'User 2',
        email: `user2-${Date.now()}@example.com`,
        password: 'password123',
        businessName: 'Organization 2',
      });

    org2Token = org2.body.token;
    org2Id = org2.body.organization.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Client Isolation', () => {
    it('should not allow org1 to access org2 clients', async () => {
      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          name: 'Org2 Client',
          email: 'org2client@example.com',
        });

      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.clients).toBeDefined();
      expect(response.body.clients.length).toBe(0);
    });

    it('should allow org1 to access only their own clients', async () => {
      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          name: 'Org1 Client',
          email: 'org1client@example.com',
        });

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          name: 'Org2 Client',
          email: 'org2client@example.com',
        });

      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.clients).toBeDefined();
      expect(response.body.clients.length).toBe(1);
      expect(response.body.clients[0].name).toBe('Org1 Client');
    });
  });

  describe('Invoice Isolation', () => {
    it('should not allow org1 to access org2 invoices', async () => {
      const clientResponse = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          name: 'Org2 Client',
          email: 'org2client@example.com',
        });

      const clientId = clientResponse.body.client.id;

      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${org2Token}`)
        .send({
          clientId: clientId,
          items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        });

      const response = await request(app)
        .get('/api/invoices')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.invoices).toBeDefined();
      expect(response.body.invoices.length).toBe(0);
    });
  });
});
