# Real Estate Agent Portal - Frontend

A modern, responsive admin portal for managing properties, conversations, and analytics for the WhatsApp AI Sales Agent.

## Features

✅ **Authentication**
- Login and Registration
- Password Reset Flow
- Protected Routes
- JWT Token Management

✅ **Dashboard**
- Overview Statistics
- Lead Quality Distribution
- Quick Actions

✅ **Property Management**
- List Properties
- View Property Details
- Add/Edit Properties (placeholder)
- Bulk Upload (placeholder)

✅ **Conversation Management**
- List Conversations
- View Conversation Details
- Lead Quality Indicators
- Export Functionality

✅ **Analytics** (placeholder)
- Performance Metrics
- Charts and Graphs

✅ **Settings** (placeholder)
- Profile Management
- Notification Preferences

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Charts**: Recharts

## Project Structure

```
admin-portal/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (Button, Input, Card, etc.)
│   │   └── ProtectedRoute.tsx
│   ├── layouts/            # Layout components
│   │   ├── AuthLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard page
│   │   ├── properties/     # Property management pages
│   │   ├── conversations/  # Conversation pages
│   │   ├── analytics/      # Analytics pages
│   │   └── settings/       # Settings pages
│   ├── services/           # API service modules
│   │   ├── auth.service.ts
│   │   ├── agent.service.ts
│   │   ├── property.service.ts
│   │   ├── conversation.service.ts
│   │   └── analytics.service.ts
│   ├── store/              # Zustand stores
│   │   └── auth-store.ts
│   ├── lib/                # Utilities and helpers
│   │   ├── api-client.ts   # Axios instance with interceptors
│   │   └── utils.ts        # Helper functions
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running at `http://localhost:5000`

### Installation

1. **Navigate to the admin-portal directory**:
   ```bash
   cd admin-portal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_APP_NAME=Real Estate Agent Portal
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## API Integration

The frontend communicates with the backend API through the `apiClient` configured in `src/lib/api-client.ts`. 

### Features:
- **Automatic Token Injection**: JWT tokens are automatically added to requests
- **Token Refresh**: Automatically refreshes expired tokens
- **Error Handling**: Centralized error handling with user-friendly messages
- **Request/Response Interceptors**: For logging and debugging

### API Endpoints Used:

**Authentication**:
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/logout`
- POST `/api/auth/refresh-token`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- GET `/api/auth/me`

**Agent Management**:
- GET `/api/agents/profile`
- PUT `/api/agents/profile`
- GET `/api/agents/stats`
- PUT `/api/agents/settings`

**Properties**:
- GET `/api/properties`
- GET `/api/properties/:id`
- POST `/api/properties`
- PUT `/api/properties/:id`
- DELETE `/api/properties/:id`
- POST `/api/properties/bulk-upload`

**Conversations**:
- GET `/api/conversations`
- GET `/api/conversations/:id`
- POST `/api/conversations/:id/takeover`
- POST `/api/conversations/:id/close`
- GET `/api/conversations/:id/export`

**Analytics**:
- GET `/api/analytics/overview`
- GET `/api/analytics/conversations`
- GET `/api/analytics/leads`
- GET `/api/analytics/properties`

## State Management

The app uses **Zustand** for state management with the following stores:

### Auth Store (`auth-store.ts`)
Manages authentication state:
- Agent information
- Access and refresh tokens
- Login/logout actions
- Persisted to localStorage

## Styling

The app uses **Tailwind CSS** for styling with a custom design system:

### Color Palette:
- **Primary**: Blue shades (500-700)
- **Success**: Green (emerald)
- **Warning**: Yellow (amber)
- **Danger**: Red
- **Gray**: Neutral grays for text and borders

### Component Variants:
- Buttons: primary, secondary, outline, ghost, danger
- Cards: default, bordered, elevated
- Badges: primary, success, warning, danger, info, gray

## Form Validation

Forms use **React Hook Form** with **Zod** for validation:

```typescript
const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Routing

The app uses **React Router v6** with the following structure:

```
/login                          - Login page
/register                       - Registration page
/forgot-password                - Password reset request
/reset-password?token=...       - Password reset completion
/dashboard                      - Dashboard (protected)
/properties                     - Properties list (protected)
/properties/add                 - Add property (protected)
/properties/:id                 - Property details (protected)
/properties/:id/edit            - Edit property (protected)
/properties/bulk-upload         - Bulk upload (protected)
/conversations                  - Conversations list (protected)
/conversations/:id              - Conversation details (protected)
/analytics                      - Analytics dashboard (protected)
/settings                       - Settings page (protected)
```

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deployment Options

1. **Static Hosting** (Vercel, Netlify, etc.)
   - Deploy the `dist/` directory
   - Configure environment variables
   - Set up redirects for SPA routing

2. **Docker**
   - Create a Dockerfile with Nginx to serve the built files
   - Example:
   ```dockerfile
   FROM node:18 AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Use meaningful component and variable names

### Component Structure
```typescript
// 1. Imports
import React from 'react';
import { Component } from 'library';

// 2. Types
interface ComponentProps {
  prop: string;
}

// 3. Component
const Component = ({ prop }: ComponentProps) => {
  // 4. State and hooks
  const [state, setState] = useState();

  // 5. Effects
  useEffect(() => {}, []);

  // 6. Handlers
  const handleClick = () => {};

  // 7. Render
  return <div>{prop}</div>;
};

// 8. Export
export default Component;
```

### Best Practices
- Keep components small and focused
- Use custom hooks for reusable logic
- Avoid prop drilling (use context or state management)
- Implement proper error boundaries
- Add loading states for async operations
- Validate forms before submission
- Handle errors gracefully with user feedback

## Troubleshooting

### Common Issues

**1. API Connection Errors**
- Ensure backend is running at `http://localhost:5000`
- Check CORS settings on backend
- Verify API_URL in `.env` file

**2. Build Errors**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `rm -rf .vite`
- Update dependencies: `npm update`

**3. Type Errors**
- Run type check: `npm run type-check`
- Ensure all types are properly defined
- Check for missing imports

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Proprietary - All rights reserved

## Support

For support, contact the development team.

---

**Version**: 1.0.0
**Last Updated**: October 5, 2025
