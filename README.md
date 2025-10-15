# MIA Frontend

Marketing Intelligence Agent - React + Vite Frontend

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Three.js** - 3D graphics
- **Zustand** - State management

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

The frontend runs on `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

### Project Structure

```
src/
├── components/       # React components
├── contexts/         # React context providers
├── assets/           # Images, icons, etc.
├── styles/           # CSS files
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## Environment Variables

Create a `.env` file (optional):

```bash
# Backend URL (only needed for production)
VITE_PRODUCTION_URL=https://your-backend-url.com
```

## Backend Integration

The frontend expects the backend to be running on `http://localhost:8000` in development.

See `../mia-backend/` for backend setup.

---

**Last Updated**: October 14, 2025
