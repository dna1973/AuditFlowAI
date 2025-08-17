# replit.md

## Overview
AuditFlow is a Software-as-a-Service (SaaS) platform for automated auditing of condominium financial statements. The application specializes in analyzing PDF documents of condominium accounting reports using AI to detect inconsistencies, generate insights, and provide professional audit reports. The platform serves two primary user types: condominium administrators managing multiple properties and individual condominium auditors/council members focusing on single properties.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client application uses a **modern React single-page application (SPA)** architecture built with:
- **React 18** with TypeScript for component development
- **Vite** as the build tool and development server for fast hot reloading
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query** (React Query) for server state management and caching
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with dark/light theme support
- **Recharts** for data visualization (charts and graphs)

The frontend follows a **component-based architecture** with:
- Page components in `/client/src/pages/` for major routes
- Reusable UI components in `/client/src/components/`
- Custom hooks for shared logic like authentication (`useAuth`)
- Centralized query client configuration for API calls

### Backend Architecture
The server uses **Express.js** with TypeScript in an **API-first design**:
- **Express** web framework for HTTP server and middleware
- **RESTful API design** with routes organized by resource type
- **Service layer pattern** with separate services for business logic
- **Repository pattern** with a storage abstraction for database operations
- **Middleware-based architecture** for authentication, logging, and error handling

### Authentication & Authorization
- **OpenID Connect (OIDC)** integration with Replit's authentication service
- **Session-based authentication** using express-session with PostgreSQL session storage
- **Passport.js** strategy for handling OIDC flows
- **Route-level protection** with authentication middleware
- **User session management** with automatic token refresh

### Database & Data Storage
- **PostgreSQL** as the primary relational database using Neon serverless
- **Drizzle ORM** with TypeScript for type-safe database operations and migrations
- **Schema-first approach** with shared types between client and server
- **Database entities**: Users, Condominiums, Audits, and Audit Reports
- **Connection pooling** using Neon's serverless connection pool

### File Storage & Processing
- **Google Cloud Storage** for PDF document storage and management
- **Object-based access control** with custom ACL policies for document security
- **Uppy** file upload library with drag-and-drop interface
- **Multi-part upload support** for large PDF files (up to 50MB)
- **PDF text extraction** using pdf.js-extract for document processing

### AI Integration
- **OpenAI GPT-4** integration for automated document analysis
- **PDF text extraction pipeline** converting documents to analyzable text
- **Structured AI responses** with predefined schemas for audit findings
- **Expense categorization** and inconsistency detection algorithms
- **Audit report generation** with financial summaries and visual insights

### State Management & Caching
- **TanStack Query** for server state with automatic background refetching
- **Optimistic updates** for better user experience during mutations
- **Centralized error handling** with toast notifications
- **Query invalidation strategies** for data consistency

### Styling & Theme System
- **Design system** based on shadcn/ui with consistent component patterns
- **Dark/light theme support** with system preference detection
- **CSS custom properties** for theme variables and consistent spacing
- **Glassmorphism effects** for modern visual appeal (sidebar blur effects)
- **Responsive design** with mobile-first approach using Tailwind breakpoints

### Development & Build Process
- **TypeScript** for type safety across the full stack
- **Shared schema definitions** between client and server via `/shared` directory
- **ESBuild** for server bundling and **Vite** for client bundling
- **Path aliases** configured for clean imports (`@/` for client, `@shared/` for shared)
- **Hot module replacement** in development with Vite

## External Dependencies

### Cloud Services
- **Neon Database** - Serverless PostgreSQL hosting with connection pooling
- **Google Cloud Storage** - Object storage for PDF documents with ACL management
- **OpenAI API** - GPT-4 integration for document analysis and audit report generation
- **Replit Authentication** - OpenID Connect provider for user authentication

### Key Third-Party Libraries
- **Drizzle ORM** - Type-safe database operations and schema management
- **Passport.js** - Authentication middleware with OpenID Connect strategy
- **Uppy** - File upload handling with cloud storage integration
- **TanStack Query** - Server state management and data fetching
- **Recharts** - Data visualization for charts and analytics
- **pdf.js-extract** - PDF text extraction for document processing
- **Radix UI** - Headless UI primitives for accessible components
- **Tailwind CSS** - Utility-first CSS framework

### Development Dependencies
- **Vite** - Build tool and development server
- **TypeScript** - Type checking and compilation
- **ESBuild** - Server-side bundling for production builds
- **React Hook Form** - Form state management with Zod validation