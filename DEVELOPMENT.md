# LiveUnpad Development Guide

## Project Overview

LiveUnpad is a live event management platform built with Next.js. It consists of:

- **Frontend** (liveunpad-app): React-based web application using Next.js
- **Backend** (liveunpad-api): Next.js API server with Prisma ORM

## Quick Start

### Option 1: Manual Setup
```bash
# Run setup script (creates directory structure and installs dependencies)
./setup.bat  # Windows
./setup.sh   # macOS/Linux

# Configure environment variables
cp liveunpad-api/.env.example liveunpad-api/.env.local
cp liveunpad-app/.env.example liveunpad-app/.env.local

# Start PostgreSQL
docker-compose up postgres

# Run database migrations
cd liveunpad-api && npm run prisma:migrate

# Start backend (Terminal 1)
cd liveunpad-api && npm run dev

# Start frontend (Terminal 2)
cd liveunpad-app && npm run dev
```

### Option 2: Docker Compose
```bash
# Start PostgreSQL container
docker-compose up postgres

# Follow manual setup steps for dependencies and migrations
```

## Project Structure

```
live-unpad/
├── liveunpad-api/              # Backend API
│   ├── pages/api/              # API routes
│   ├── lib/                    # Utilities and helpers
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── liveunpad-app/              # Frontend Application
│   ├── pages/                  # Next.js pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities and helpers
│   ├── styles/                 # CSS files
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
├── .github/
│   └── workflows/              # CI/CD workflows
├── docker-compose.yml
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

## Environment Variables

### Backend (liveunpad-api/.env.local)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/liveunpad
API_PORT=3001
NODE_ENV=development
```

### Frontend (liveunpad-app/.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

## Development Commands

### Backend
```bash
cd liveunpad-api

# Development server
npm run dev

# Build for production
npm run build

# Production server
npm start

# Database migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Run tests
npm test

# Linting
npm run lint
```

### Frontend
```bash
cd liveunpad-app

# Development server
npm run dev

# Build for production
npm run build

# Production server
npm start

# Run tests
npm test

# Linting
npm run lint
```

## Database Management

### Create a new migration
```bash
cd liveunpad-api
npx prisma migrate dev --name <migration_name>
```

### View database in Prisma Studio
```bash
cd liveunpad-api
npm run prisma:studio
```

### Reset database (CAUTION: deletes all data)
```bash
cd liveunpad-api
npx prisma migrate reset
```

## API Endpoints

### Health Check
- `GET http://localhost:3001/api/health` - Returns API status

### Root
- `GET http://localhost:3001/api` - Returns welcome message

Add more endpoints in `liveunpad-api/pages/api/`

## Frontend Pages

- `http://localhost:3000/` - Home page (checks API connection)

Add more pages in `liveunpad-app/pages/`

## Testing

### Run all tests
```bash
npm test --workspaces
```

### Run specific project tests
```bash
cd liveunpad-api && npm test
cd liveunpad-app && npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

## Linting & Formatting

### ESLint
```bash
npm run lint --workspaces
```

### Auto-fix linting issues
```bash
npm run lint -- --fix --workspaces
```

## CI/CD Workflows

GitHub Actions workflows are configured in `.github/workflows/`:

- `backend-ci.yml` - Backend CI (tests, linting)
- `frontend-ci.yml` - Frontend CI (tests, linting, build)
- `backend-deploy.yml` - Backend deployment (production)
- `frontend-deploy.yml` - Frontend deployment (production)

Configure deployment secrets in GitHub repository settings.

## Troubleshooting

### Database connection error
- Ensure PostgreSQL is running: `docker-compose up postgres`
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL is accessible on port 5432

### Port already in use
- Backend default: 3001
- Frontend default: 3000
- Change ports in respective `pages/api/index.ts` or `next.dev` command

### Dependencies not installing
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma client not generated
```bash
cd liveunpad-api
npx prisma generate
```

## Deployment

Both applications support various deployment platforms:
- **Vercel** (recommended for Next.js)
- **Heroku**
- **AWS Elastic Beanstalk**
- **DigitalOcean**
- **Docker/Kubernetes**

See deployment workflows in `.github/workflows/` for examples.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
