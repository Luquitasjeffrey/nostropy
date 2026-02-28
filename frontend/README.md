# Nostropy - Frontend

This is the frontend client for the Nostropy open-source casino.
It is built using:
- **React** 
- **Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (for animations)
- **Lucide React** (for icons)

## Getting Started

To run the frontend development server, you must have Node.js installed. Ensure that you also have the Express backend running from the root directory of the monorepo.

1. Install the dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`).

### Environment Variables
The application expects to connect to the backend API. By default, it proxies or connects to `http://localhost:5000/api`. If your backend is hosted elsewhere, you can configure an environment variable:
`VITE_API_URL=http://your-backend-url/api`

## Architecture overview
- `src/components/MinesPage.tsx`: The main game container.
- `src/components/mines/MinesGrid.tsx`: The animated interactive 5x5 game board.
- `src/components/mines/MinesControls.tsx`: The betting and input controls side-panel.
- `src/components/ui`: Reusable styled components like Button and Input.
