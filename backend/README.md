# MediPulse Backend

Production-ready backend for MediPulse application.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    MONGO_URI=mongodb+srv://... (or local)
    NODE_ENV=development
    JWT_SECRET=supersecret_jwt_key_min_10_chars
    REFRESH_TOKEN_SECRET=supersecret_refresh_key_min_10_chars
    CORS_ORIGIN=*
    ```

3.  **Run Development**:
    ```bash
    npm run dev
    ```

4.  **Run Tests**:
    ```bash
    npm test
    ```

## Architecture
- **Framework**: Express + TypeScript
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (Access + Hashed Refresh Token)
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, Rate Limit, CORS

## Folder Structure
- `src/config`: Configuration (Env, DB)
- `src/controllers`: Request Handlers
- `src/middleware`: Custom Middleware
- `src/models`: Mongoose Models
- `src/repositories`: Data Access Layer
- `src/routes`: API Routes
- `src/services`: Business Logic
- `src/utils`: Utilities (Logger, JWT)
