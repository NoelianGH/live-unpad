# Contributing to LiveUnpad

Thank you for your interest in contributing to LiveUnpad! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Run the setup script:
   ```bash
   ./setup.bat  # Windows
   ./setup.sh   # macOS/Linux
   ```

## Development Workflow

### Backend Development
```bash
cd liveunpad-api
npm run dev
```

### Frontend Development
```bash
cd liveunpad-app
npm run dev
```

### Database Migrations
```bash
cd liveunpad-api
npx prisma migrate dev --name <migration_name>
```

### Running Tests
```bash
# Backend
cd liveunpad-api && npm test

# Frontend
cd liveunpad-app && npm test
```

### Linting and Formatting
```bash
# Backend
cd liveunpad-api && npm run lint

# Frontend
cd liveunpad-app && npm run lint
```

## Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier rules
- Write meaningful commit messages
- Add tests for new features

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit them
3. Push to your fork: `git push origin feature/your-feature`
4. Create a Pull Request with a clear description
5. Address any comments from reviewers

## Commit Message Convention

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that don't affect code meaning
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `test:` Adding missing tests
- `chore:` Changes to build process or dependencies

Example: `feat: add user authentication`

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)

## Questions?

Feel free to open an issue for any questions or discussions!
