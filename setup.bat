@echo off
REM Development setup script for LiveUnpad for Windows

echo 🚀 Setting up LiveUnpad development environment...

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd liveunpad-api
call npm install
call npx prisma generate
cd ..

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd liveunpad-app
call npm install
cd ..

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Configure environment variables:
echo    - copy liveunpad-api\.env.example liveunpad-api\.env.local
echo    - copy liveunpad-app\.env.example liveunpad-app\.env.local
echo.
echo 2. Start PostgreSQL (using docker):
echo    - docker-compose up postgres
echo.
echo 3. Run database migrations:
echo    - cd liveunpad-api ^&^& npm run prisma:migrate
echo.
echo 4. Start development servers:
echo    - Terminal 1: cd liveunpad-api ^&^& npm run dev
echo    - Terminal 2: cd liveunpad-app ^&^& npm run dev
echo.
echo Frontend: http://localhost:3000
echo Backend: http://localhost:3001
echo Prisma Studio: cd liveunpad-api ^&^& npm run prisma:studio
