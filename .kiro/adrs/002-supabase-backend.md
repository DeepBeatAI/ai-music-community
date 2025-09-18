# ADR-002: Supabase Backend Platform

## Status
**Accepted** - September 2025

## Context
Need a backend platform that provides:
- PostgreSQL database with real-time capabilities
- Authentication and user management
- File storage for audio content
- Row Level Security for data protection
- API generation and management
- Minimal operational overhead for solo developer

## Decision
**Selected: Supabase (Database + Auth + Storage + Real-time)**

### Alternatives Considered
1. **Firebase**: Google's platform, good real-time but NoSQL limitations
2. **AWS (RDS + S3 + Cognito)**: Most powerful but complex setup and management
3. **PlanetScale + Auth0 + S3**: Best-in-class services but integration complexity
4. **Self-hosted PostgreSQL**: Maximum control but high operational burden

## Rationale
- **PostgreSQL**: Full SQL capabilities essential for complex music community features
- **Integrated Platform**: Single platform reduces integration complexity
- **Real-time**: Built-in real-time subscriptions perfect for social features
- **Row Level Security**: Database-level security ideal for multi-tenant application
- **Developer Experience**: Excellent tooling and documentation
- **Scaling Path**: Can handle growth from prototype to production
- **Cost Efficiency**: Generous free tier with predictable scaling costs

## Consequences

### Positive
- ✅ Rapid backend development with generated APIs
- ✅ Built-in authentication with social login options
- ✅ Real-time subscriptions for live social features
- ✅ PostgreSQL provides complex query capabilities
- ✅ Integrated file storage with CDN capabilities
- ✅ Row Level Security simplifies multi-user data protection
- ✅ Excellent TypeScript integration with generated types

### Negative
- ❌ Platform lock-in (migration would require significant rewrite)
- ❌ Less mature than competitors like Firebase or AWS
- ❌ Limited customization of authentication flows
- ❌ Real-time features can be complex to debug
- ❌ Storage costs can scale quickly with audio content

### Technical Implications
- Database design must leverage PostgreSQL strengths (JSONB, full-text search)
- Authentication flows limited to Supabase capabilities
- Real-time features require careful subscription management
- File upload strategy must work within Supabase Storage constraints
- Migration strategy needed for potential future platform changes

### Business Implications
- Faster development reduces time to market
- Lower operational complexity supports solo developer model
- Integrated platform reduces multiple vendor relationships
- Strong foundation for real-time social features
- Predictable cost structure aids financial planning

### Security Considerations
- Row Level Security provides database-level multi-tenancy
- Built-in authentication reduces security implementation risks
- Regular security updates handled by Supabase team
- GDPR compliance features available out of the box
- API rate limiting and abuse protection included

---

*Decision Date: September 2025*  
*Review Date: Every 6 months or when scaling challenges arise*
