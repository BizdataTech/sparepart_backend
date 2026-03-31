# User Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or cloud)
- Cloudinary account (for image uploads)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory with the following variables:

```
eg:

PORT=4000
CONNECTION_STRING=mongodb://your-mongodb-connection-string
```

### 4. Start the Server

**Development Mode** (with auto-reload):

```bash
npm run dev
```

**Production Mode**:

```bash
npm start
```

The server will start on `PORT 4000` by default.

## Available Scripts

- `npm run dev` - Runs server in development mode with nodemon
- `npm start` - Runs server in production mode
- `npm run create` - Create products (development script)
- `npm run products` - Sample product creation

## Success Check

If setup is successful, you should see in the terminal:

```
Database connected
Server listening for request via port 1000
```

## Troubleshooting

- **Connection Error**: Check your MongoDB connection string in `.env`
- **Port Already in Use**: Change `PORT` in `.env` file
- **Module Not Found**: Run `npm install` again
- **Cloudinary Errors**: Verify your Cloudinary credentials in `.env`

## API Base URL

Once running, the API endpoints will be available at:

```
http://localhost:4000/api
```

All requests should include the `/api` prefix (e.g., `/api/users`, `/api/products`)
