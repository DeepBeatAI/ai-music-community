# Authentication Endpoints API Specification

## Overview
Authentication API endpoints for user registration, login, logout, and session management using Supabase Auth integration.

## Base Configuration
```typescript
// API Base Configuration
const API_BASE = '/api/auth'
const SUPABASE_AUTH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1'

interface AuthResponse {
  user: User | null
  session: Session | null
  error: AuthError | null
}
```

## Authentication Endpoints

### POST /api/auth/register
**Purpose:** Register new user account with email and password

#### Request Body
```typescript
interface RegisterRequest {
  email: string              // Valid email address
  password: string           // Minimum 8 characters
  displayName?: string       // Optional display name
  redirectTo?: string        // Optional redirect URL after email confirmation
}
```

#### Response
```typescript
interface RegisterResponse {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      email: string
      emailConfirmed: boolean
      createdAt: string
    }
  }
  error?: string
}
```

#### Example Usage
```typescript
// Registration request
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'creator@example.com',
    password: 'securePassword123',
    displayName: 'AI Music Creator'
  })
})

// Success Response (201)
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "creator@example.com",
      "emailConfirmed": false,
      "createdAt": "2025-09-18T10:30:00Z"
    }
  }
}
```

### POST /api/auth/login
**Purpose:** Authenticate user with email and password

#### Request Body
```typescript
interface LoginRequest {
  email: string              // User's email address
  password: string           // User's password
  rememberMe?: boolean       // Optional persistent session
}
```

#### Response
```typescript
interface LoginResponse {
  success: boolean
  message: string
  data?: {
    user: User
    session: Session
    profile: UserProfile
  }
  error?: string
}
```

#### Example Usage
```typescript
// Login request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'creator@example.com',
    password: 'securePassword123',
    rememberMe: true
  })
})

// Success Response (200)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "creator@example.com",
      "emailConfirmed": true
    },
    "session": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresAt": "2025-09-18T11:30:00Z"
    },
    "profile": {
      "username": "ai_creator_123",
      "displayName": "AI Music Creator",
      "bio": null,
      "avatarUrl": null
    }
  }
}
```

### POST /api/auth/logout
**Purpose:** End user session and clear authentication tokens

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface LogoutResponse {
  success: boolean
  message: string
}
```

#### Example Usage
```typescript
// Logout request
const response = await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})

// Success Response (200)
{
  "success": true,
  "message": "Logout successful"
}
```

### POST /api/auth/forgot-password
**Purpose:** Send password reset email to user

#### Request Body
```typescript
interface ForgotPasswordRequest {
  email: string              // User's email address
  redirectTo?: string        // Optional redirect URL after password reset
}
```

#### Response
```typescript
interface ForgotPasswordResponse {
  success: boolean
  message: string
}
```

### POST /api/auth/reset-password
**Purpose:** Reset user password with reset token

#### Request Body
```typescript
interface ResetPasswordRequest {
  token: string              // Password reset token from email
  password: string           // New password (minimum 8 characters)
}
```

### GET /api/auth/session
**Purpose:** Get current user session and profile information

#### Request Headers
```typescript
Authorization: Bearer <access_token>
```

#### Response
```typescript
interface SessionResponse {
  success: boolean
  data?: {
    user: User
    session: Session
    profile: UserProfile
  }
  error?: string
}
```

### POST /api/auth/refresh
**Purpose:** Refresh expired access token using refresh token

#### Request Body
```typescript
interface RefreshRequest {
  refreshToken: string       // Valid refresh token
}
```

## Social Authentication Endpoints

### GET /api/auth/social/[provider]
**Purpose:** Initiate OAuth login with social provider

#### Supported Providers
- `google` - Google OAuth
- `github` - GitHub OAuth  
- `discord` - Discord OAuth

#### Query Parameters
```typescript
interface SocialAuthQuery {
  redirectTo?: string        // Optional redirect URL after authentication
  scopes?: string           // Optional additional OAuth scopes
}
```

### GET /api/auth/callback/[provider]
**Purpose:** Handle OAuth callback from social provider

## Error Responses

### Authentication Errors
```typescript
// Error Response Format (400/401/422)
{
  "success": false,
  "error": "Invalid credentials",
  "details": {
    "code": "INVALID_CREDENTIALS",
    "field": "password",
    "message": "The password you entered is incorrect"
  }
}

// Common Error Codes
interface AuthErrorCodes {
  INVALID_CREDENTIALS: 'Email or password is incorrect'
  EMAIL_NOT_CONFIRMED: 'Please confirm your email address'
  WEAK_PASSWORD: 'Password must be at least 8 characters'
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists'
  INVALID_TOKEN: 'Authentication token is invalid or expired'
  SESSION_EXPIRED: 'Your session has expired, please login again'
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
}
```

## Security Headers

### Required Request Headers
```typescript
interface SecurityHeaders {
  'Content-Type': 'application/json'
  'X-Requested-With': 'XMLHttpRequest'  // CSRF protection
  'Origin': 'https://aimusic.community'  // Origin validation
}
```

### Response Security Headers
```typescript
interface ResponseHeaders {
  'X-Content-Type-Options': 'nosniff'
  'X-Frame-Options': 'DENY'
  'X-XSS-Protection': '1; mode=block'
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

## Rate Limiting

### Authentication Rate Limits
```typescript
interface RateLimits {
  login: '5 attempts per minute per IP'
  register: '3 attempts per minute per IP'  
  forgotPassword: '2 attempts per minute per email'
  refreshToken: '10 attempts per minute per user'
}
```

## Middleware Integration

### Authentication Middleware
```typescript
// Next.js middleware for protected routes
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}
```

## Testing Considerations

### Authentication Test Cases
```typescript
describe('Authentication API', () => {
  test('Register with valid credentials succeeds')
  test('Register with existing email fails')
  test('Login with valid credentials succeeds')
  test('Login with invalid credentials fails')
  test('Password reset flow works correctly')
  test('Social authentication redirects properly')
  test('Rate limiting prevents abuse')
  test('Session refresh works correctly')
})
```

---

*API Specification Version: 1.0*  
*Last Updated: September 2025*  
*Compatible with: Supabase Auth v2, Next.js 15*
