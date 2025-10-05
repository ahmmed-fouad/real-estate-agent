# Quick Start Guide - Agent Portal

## Prerequisites

- Node.js 18+ installed
- Backend API running at `http://localhost:5000`
- npm or yarn package manager

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd admin-portal
npm install
```

This will install all required dependencies (~100 packages).

### Step 2: Environment Configuration

Create a `.env` file in the `admin-portal` directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Real Estate Agent Portal
```

### Step 3: Start Development Server

```bash
npm run dev
```

The application will start at: **http://localhost:3000**

## First Time Usage

### 1. Register an Account

- Navigate to `http://localhost:3000/register`
- Fill in the registration form:
  - Full Name (required)
  - Email (required)
  - Password (required - min 8 chars, must include uppercase, lowercase, and number)
  - Phone Number (optional)
  - WhatsApp Number (optional)
  - Company Name (optional)
- Click "Create account"
- You'll be automatically logged in and redirected to the dashboard

### 2. Explore the Dashboard

After login, you'll see:
- **Statistics Cards**: Total conversations, active conversations, properties, and leads
- **Lead Quality**: Distribution of hot, warm, and cold leads
- **Quick Actions**: Shortcuts to add properties, view conversations, and analytics

### 3. Add Your First Property

**Option A: Manual Entry**
- Click "Add Property" button
- Fill in the property form (placeholder - will be fully implemented)

**Option B: Bulk Upload**
- Click "Bulk Upload" button
- Download the CSV template
- Fill in your properties data
- Upload the file
- (Feature pending implementation)

### 4. View Conversations

- Navigate to "Conversations" from the sidebar
- View all customer interactions
- Click on a conversation to see the full chat history
- Take over conversations when needed (feature pending)

### 5. Check Analytics

- Navigate to "Analytics" from the sidebar
- View performance metrics
- Export reports
- (Full charts implementation pending)

### 6. Configure Settings

- Navigate to "Settings" from the sidebar
- Update your profile
- Configure response templates
- Set working hours
- Manage notification preferences
- (Full implementation pending)

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
admin-portal/
├── src/
│   ├── components/      # Reusable UI components
│   ├── layouts/         # Layout components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── store/           # State management
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── public/              # Static assets
└── [config files]       # Configuration files
```

## Troubleshooting

### Problem: Cannot connect to backend

**Solution**:
- Ensure backend is running at `http://localhost:5000`
- Check `.env` file has correct `VITE_API_URL`
- Verify CORS is enabled on backend

### Problem: Build errors

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

### Problem: TypeScript errors

**Solution**:
```bash
# Run type check to see all errors
npm run type-check
```

## API Endpoints

The portal integrates with these backend endpoints:

- **Auth**: `/api/auth/*`
- **Agents**: `/api/agents/*`
- **Properties**: `/api/properties/*`
- **Conversations**: `/api/conversations/*`
- **Analytics**: `/api/analytics/*`

Refer to backend API documentation for details.

## Next Steps

1. **Test Authentication**:
   - Register and login
   - Try password reset
   - Test logout

2. **Explore Features**:
   - View dashboard statistics
   - Browse properties
   - Check conversations

3. **Wait for Full Implementation**:
   - Property forms
   - Bulk upload
   - Live takeover
   - Analytics charts
   - Settings forms

## Support

For issues or questions:
- Check `README.md` for detailed documentation
- Review `TASK_3.2_IMPLEMENTATION_SUMMARY.md` for implementation details
- Contact the development team

## What's Implemented vs Pending

### ✅ Fully Implemented:
- Authentication (login, register, password reset)
- Dashboard with statistics
- Property listing and viewing
- Conversation listing and viewing
- Responsive UI/UX
- API integration

### ⏳ Pending:
- Property add/edit forms
- Bulk upload interface
- Live conversation takeover
- Analytics charts and graphs
- Settings management

---

**Happy Coding!** 🚀
