# Admin Dashboard Architecture

## Overview

The Admin Dashboard is built with a modular, security-first architecture that separates concerns across multiple layers: database, backend services, middleware, and frontend UI.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Application                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Admin Route  │  │ Protected    │  │ Navigation   │          │
│  │ /admin       │  │ Routes       │  │ Menu         │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                            │
│                   │  Admin Context  │                            │
│                   │  & Middleware   │                            │
│                   └────────┬────────┘                            │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐          │
│  │ User Mgmt    │  │ Platform     │  │ Security     │          │
│  │ Tab          │  │ Admin Tab    │  │ Tab          │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Performance  │  │ Analytics    │                            │
│  │ & Health Tab │  │ Tab          │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase API   │
                    └────────┬────────┘
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    Database Layer                                 │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ user_profiles    │  │ user_plan_tiers  │                      │
│  │ user_roles       │  │ user_type_audit  │                      │
│  └──────────────────┘  └──────────────────┘                      │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │ admin_audit_log  │  │ security_events  │                      │
│  │ platform_config  │  │ system_metrics   │                      │
│  └──────────────────┘  └──────────────────┘                      │
│                                                                   │
│  ┌──────────────────────────────────────────┐                    │
│  │         Row Level Security (RLS)         │                    │
│  │  - Admin-only access policies            │                    │
│  │  - Audit log protection                  │                    │
│  │  - Configuration access control          │                    │
│  └──────────────────────────────────────────┘                    │
└───────────────────────────────────────────────────────────────────┘
```

## Layer Breakdown

### 1. Database Layer

**Purpose**: Store and protect admin data with Row Level Security

**Components**:
- **Admin Tables**: `admin_audit_log`, `security_events`, `platform_config`, `system_metrics`, `user_sessions`
- **Database Functions**: Admin operations (logging, config management, user management)
- **RLS Policies**: Admin-only access enforcement
- **Indexes**: Performance optimization for queries

**Key Features**:
- All admin tables protected by RLS
- Audit logs are immutable (no UPDATE/DELETE policies)
- Automatic timestamp management via triggers
- Foreign key constraints with CASCADE deletes

### 2. Backend Services Layer

**Purpose**: Business logic and data access

**Components**:
- **Admin Service** (`lib/adminService.ts`): User management operations
- **Platform Config Service** (`lib/platformConfigService.ts`): Configuration management
- **Security Service** (`lib/securityService.ts`): Security monitoring
- **System Health Service** (`lib/systemHealthService.ts`): Performance metrics
- **Analytics Service** (`lib/analyticsService.ts`): Business analytics

**Key Features**:
- Type-safe API with TypeScript
- Comprehensive error handling
- Audit logging for all operations
- Caching for frequently accessed data

### 3. Middleware Layer

**Purpose**: Route protection and authorization

**Components**:
- **Admin Middleware** (`middleware.ts`): Route protection for `/admin`, `/analytics`, `/test-audio-compression`
- **Admin Context** (`contexts/AdminContext.tsx`): Global admin status management

**Key Features**:
- Server-side authorization checks
- Session validation
- Automatic redirect for unauthorized access
- Real-time admin status updates

### 4. Frontend UI Layer

**Purpose**: User interface for admin operations

**Components**:
- **Admin Dashboard Layout** (`app/admin/page.tsx`): Tab navigation and layout
- **User Management Tab**: User account management
- **Platform Administration Tab**: Platform configuration
- **Security Tab**: Security monitoring and audit logs
- **Performance & System Health Tab**: System metrics and health
- **Analytics Tab**: Business metrics and analytics

**Key Features**:
- Tab-based navigation
- Lazy loading for performance
- Real-time updates for security events
- Responsive design for all devices
- Loading and error states

## Data Flow

### Admin Action Flow

1. **User Initiates Action**: Admin clicks button in UI
2. **Frontend Validation**: Client-side validation (optional)
3. **API Call**: Service function called with parameters
4. **Authorization Check**: Middleware verifies admin status
5. **Database Operation**: Function executes with RLS enforcement
6. **Audit Logging**: Action logged to `admin_audit_log`
7. **Response**: Success/error returned to UI
8. **UI Update**: Optimistic or confirmed update

### Security Event Flow

1. **Event Occurs**: Failed login, unauthorized access, etc.
2. **Event Logged**: `log_security_event()` function called
3. **Real-time Notification**: Supabase Realtime broadcasts event
4. **UI Update**: Security tab displays new event
5. **Admin Review**: Admin reviews and resolves event
6. **Resolution Logged**: Resolution recorded in database

### Metrics Collection Flow

1. **Metric Recorded**: Application records performance metric
2. **Database Insert**: `record_system_metric()` function called
3. **Aggregation**: Metrics aggregated for display
4. **Caching**: Aggregated data cached (1-minute TTL)
5. **UI Display**: Performance tab displays metrics
6. **Auto-refresh**: Metrics refresh every 5 seconds

## Security Architecture

### Defense in Depth

1. **Client-Side**: UI hides admin features from non-admins
2. **Middleware**: Server-side route protection
3. **API Layer**: Service functions verify admin status
4. **Database**: RLS policies enforce admin-only access
5. **Audit Trail**: All actions logged for accountability

### Access Control Flow

```
User Request
    ↓
Middleware Check (is authenticated?)
    ↓
Middleware Check (is admin?)
    ↓
Service Function (verify admin status)
    ↓
Database RLS (enforce admin policy)
    ↓
Audit Log (record action)
    ↓
Response
```

## Performance Optimizations

### Caching Strategy

- **User List**: 5-minute cache, invalidate on changes
- **Platform Config**: In-memory cache, invalidate on updates
- **Metrics**: 1-minute cache for aggregated data
- **Analytics**: 15-minute cache for business metrics

### Pagination

- **User List**: Cursor-based pagination (50 per page)
- **Audit Logs**: Offset pagination (100 per page)
- **Security Events**: Cursor-based pagination (50 per page)
- **Metrics**: Time-based windowing

### Lazy Loading

- **Tab Content**: Load only when tab activated
- **Chart Libraries**: Lazy load on demand
- **Modal Content**: Load on modal open
- **Export Functions**: Load on export action

## Scalability Considerations

### Database

- **Indexes**: All foreign keys and frequently queried columns
- **Partitioning**: Monthly partitions for `system_metrics`
- **Archiving**: Archive old audit logs (> 90 days)
- **Connection Pooling**: Supabase connection pooling

### Frontend

- **Code Splitting**: Separate bundles for each tab
- **Virtual Scrolling**: For large lists (future enhancement)
- **Debouncing**: Search and filter inputs
- **Memoization**: React.memo for expensive components

### Backend

- **Function Optimization**: Efficient SQL queries
- **Batch Operations**: Bulk updates where possible
- **Rate Limiting**: Prevent abuse of admin endpoints
- **Monitoring**: Track slow queries and errors

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4.3 (App Router)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS v4
- **State Management**: React Context
- **Charts**: Chart.js or Recharts (lazy loaded)

### Backend
- **Database**: PostgreSQL 15.x (Supabase)
- **Auth**: Supabase Auth with JWT
- **Real-time**: Supabase Realtime
- **Functions**: PostgreSQL functions (PL/pgSQL)

### Infrastructure
- **Hosting**: Vercel (frontend)
- **Database**: Supabase (managed PostgreSQL)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry (future)

## Design Principles

1. **Security First**: All admin operations protected and audited
2. **Performance Optimized**: Caching, pagination, lazy loading
3. **User Experience**: Responsive, intuitive, real-time updates
4. **Maintainability**: Modular, type-safe, well-documented
5. **Scalability**: Designed to handle growth
6. **Observability**: Comprehensive logging and monitoring

## Future Enhancements

- **Advanced Analytics**: Custom reports, data visualization
- **Bulk Operations**: Bulk user management, config updates
- **Scheduled Tasks**: Automated maintenance, reports
- **Notification System**: Real-time alerts for critical events
- **API Management**: API key management, rate limits
- **Content Moderation**: Integration with moderation system
- **Backup & Recovery**: Database backup management
- **Multi-Admin Support**: Role-based admin permissions
- **Audit Report Generation**: Automated compliance reports
- **Performance Tools**: Query optimizer, cache management

## Related Documentation

- [Database Schema Guide](guide-database-schema.md)
- [Security Design](../security/security-design.md)
- [API Reference](guide-api-reference.md)
- [Deployment Guide](guide-deployment-checklist.md)
