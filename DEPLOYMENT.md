# PayShield Deployment Guide

This guide covers deploying PayShield to production environments.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database (for production)
- Domain name (optional)
- SSL certificate (recommended)

## Environment Variables

Create a `.env` file in production with the following variables:

### Required
```
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:5432/payshield
JWT_SECRET=your-strong-random-secret-at-least-32-characters
```

### Optional (Payment Integrations)
```
# M-Pesa
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode

# Stripe
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_key

# Bank API
BANK_API_KEY=your_api_key
BANK_API_SECRET=your_api_secret
```

### Optional (AI Provider)
```
AI_PROVIDER_KEY=your_ai_provider_key
AI_PROVIDER_ENDPOINT=https://api.provider.com
```

### Optional (Exchange Rates)
```
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
```

## Database Setup

### PostgreSQL

1. Create a PostgreSQL database:
```sql
CREATE DATABASE payshield;
```

2. Update your `DATABASE_URL` environment variable with the connection string.

3. Run migrations:
```bash
npx prisma migrate deploy
```

4. Generate Prisma Client:
```bash
npx prisma generate
```

## Deployment Platforms

### Render

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - Create new PostgreSQL instance
   - Copy the internal database URL

2. **Create Web Service**
   - Create new web service
   - Connect your GitHub repository
   - Configure build settings:
     - Build Command: `npm install && npx prisma generate`
     - Start Command: `npm start`

3. **Add Environment Variables**
   - Add all required environment variables
   - Use the PostgreSQL internal URL for `DATABASE_URL`
   - Generate a strong `JWT_SECRET`

4. **Deploy**
   - Push to trigger deployment
   - Render will automatically build and deploy

### Heroku

1. **Create Heroku App**
```bash
heroku create payshield-app
```

2. **Add PostgreSQL Add-on**
```bash
heroku addons:create heroku-postgresql:mini
```

3. **Set Environment Variables**
```bash
heroku config:set JWT_SECRET=your-secret-key
heroku config:set NODE_ENV=production
```

4. **Deploy**
```bash
git push heroku main
```

5. **Run Migrations**
```bash
heroku run npx prisma migrate deploy
```

### Vercel

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Add Environment Variables**
   - Go to Vercel Dashboard
   - Settings → Environment Variables
   - Add all required variables

4. **Configure Build**
   - Build Command: `npm install && npx prisma generate`
   - Output Directory: `.`

### DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean Control Panel
   - Create new App
   - Connect GitHub repository

2. **Configure Components**
   - Build Command: `npm install && npx prisma generate`
   - Run Command: `npm start`
   - HTTP Port: 3000

3. **Add Database**
   - Create PostgreSQL database
   - Link to app

4. **Add Environment Variables**
   - Add all required variables in the app settings

5. **Deploy**
   - Push to trigger deployment

## SSL/TLS Configuration

### Using Cloudflare (Free SSL)

1. Point your domain to Cloudflare
2. Cloudflare provides free SSL certificates
3. Configure Cloudflare to proxy to your app

### Using Let's Encrypt

1. Install Certbot on your server
2. Generate certificate:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

3. Configure Nginx or Apache to use the certificate

### Using Platform SSL

Most platforms (Render, Heroku, Vercel) provide free SSL certificates automatically.

## Nginx Configuration (Optional)

If deploying to a VPS, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### Application Logs

PayShield logs to console. Configure your platform to capture logs:

- **Render**: View logs in dashboard
- **Heroku**: `heroku logs --tail`
- **Vercel**: View logs in dashboard
- **DigitalOcean**: View logs in dashboard

### Health Check

PayShield provides a health check endpoint:
```
GET /api/health
```

Returns:
```json
{
  "success": true,
  "status": "healthy"
}
```

## Backup Strategy

### Database Backups

- **Render**: Automatic daily backups
- **Heroku**: Automatic backups with pgbackups add-on
- **VPS**: Set up cron job with pg_dump

Example backup script:
```bash
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Security Checklist

- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Use strong PostgreSQL password
- [ ] Enable database backups
- [ ] Configure CORS to your domain only
- [ ] Review rate limiting settings
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Set up alerts for errors

## Scaling

### Horizontal Scaling

PayShield is stateless and can be scaled horizontally:
- Use load balancer (nginx, HAProxy)
- Run multiple instances
- Share PostgreSQL database
- Use Redis for session storage (if implementing sessions)

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add database indexes
- Use connection pooling

## Troubleshooting

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure firewall allows connection
- Check database credentials

### Build Failures

- Verify Node.js version
- Check all dependencies are installed
- Review build logs
- Ensure Prisma generates successfully

### Runtime Errors

- Check application logs
- Verify environment variables
- Test database connection
- Review error messages

## Performance Optimization

1. **Database Indexes**: Prisma schema includes indexes
2. **Connection Pooling**: Configure Prisma connection pool
3. **Caching**: Add Redis for frequently accessed data
4. **CDN**: Serve static assets via CDN
5. **Compression**: Enable gzip compression

## Post-Deployment Tasks

1. Test all core functionality
2. Verify authentication works
3. Test payment recording
4. Check organization isolation
5. Monitor application logs
6. Set up monitoring alerts
7. Configure backup strategy
8. Test failover procedures

## Support

For deployment issues:
- Check application logs
- Review this guide
- Visit https://devin.ai/support
