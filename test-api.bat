@echo off
curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@payshield.com\",\"password\":\"password123\",\"businessName\":\"Test Business\"}"
pause
