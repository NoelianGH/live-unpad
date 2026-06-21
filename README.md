# Live Unpad Project

A fullstack application consisting of a **Next.js frontend** and an **Express/Prisma backend** featuring an AI Chatbot with RAG (Retrieval-Augmented Generation).

---

## Prerequisities

Make sure you have the following installed on your local machine:
- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **PostgreSQL** database instance (either running locally or hosted, e.g., Neon Postgres)

---

## Project Structure

```text
live-unpad/
├── backend/      # Express API, LangChain logic, Prisma schema & migrations
├── frontend/     # Next.js app, Tailwind CSS interface
└── README.md     # Main documentation
```

---

## Backend Setup & Running

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy the environment example file:
     ```bash
     cp .env.example .env
     ```
   - Open the newly created `.env` file and fill in your connection strings and API keys (e.g., `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, etc.).

4. **Initialize the Database:**
   - Run Prisma migrations or push schema:
     ```bash
     npx prisma db push
     ```
   - Seed the database with initial data:
     ```bash
     npx prisma db seed
     ```

5. **Run the Backend Developer Server:**
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000` (or the port defined in your `.env` file).

---

## Frontend Setup & Running

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Frontend Developer Server:**
   ```bash
   npm run dev
   ```
   The Next.js frontend will run on `http://localhost:3000`. Open your browser and navigate to the address to view the app.
