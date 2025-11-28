# Admin User Guide

## Overview

This guide provides instructions for platform administrators on how to use the Admin Dashboard.

## Accessing the Admin Dashboard

### Prerequisites
- You must have an admin role assigned
- You must be logged in

### Access Steps
1. Log in to your admin account
2. Click your avatar in the top-right corner
3. Select "Admin Dashboard" from the dropdown
4. You will be redirected to `/admin`

## Dashboard Tabs

The Admin Dashboard has 5 tabs:

1. **User Management** - Manage user accounts and roles
2. **Platform Administration** - Configure platform settings
3. **Security** - Monitor security events and audit logs
4. **Performance & System Health** - View system metrics
5. **Analytics** - View business metrics

## User Management

### Viewing Users
- User list displays username, email, plan tier, and roles
- 50 users per page with pagination
- Search by username or email
- Filter by plan tier or role

### Managing Users
- Click "Edit" dropdown to view user details
- Change plan tier from dropdown
- Add/remove roles (Moderator, Tester)
- Suspend accounts with reason and duration
- Reset user passwords
- View and terminate user sessions

## Platform Administration

### Feature Flags
- Toggle features on/off
- Changes take effect immediately

### Upload Limits
- Configure max file size per plan tier
- Set max files per month per plan tier

### Announcements
- Create platform-wide announcements
- Set start and end dates
- Target specific plan tiers

### Email Templates
- Edit welcome, password reset, and upgrade emails
- Use variables: {{username}}, {{email}}, {{link}}

### Rate Limits
- Configure API requests per minute
- Set upload requests per hour

## Security

### Security Events
- View events by severity (Critical, High, Medium, Low)
- Filter by event type and date range
- Mark events as resolved with notes

### Audit Logs
- View all admin actions with timestamps
- Filter by action type, admin user, date range
- See old and new values for changes

### Active Sessions
- View all active user sessions
- Terminate suspicious sessions
- See IP address and last activity

### Security Policies
- Configure password requirements
- Set session timeout duration
- Adjust failed login threshold

## Performance & System Health

### System Health
- Database status and query times
- Storage usage and capacity
- API health (Supabase, Vercel)
- Error rate and uptime

### Performance Metrics
- Page load times (avg, P95, P99)
- API response times
- Cache hit rate
- Error rate

### Slow Queries
- View queries taking > 1 second
- See optimization recommendations
- Apply suggested fixes

### Cache Management
- View cache hit rate
- Clear specific caches
- Monitor cache size

### Error Logs
- View recent errors by type
- See error frequency
- Access full stack traces

## Analytics

### User Growth
- Total users and new registrations
- Growth rate percentage
- User growth chart

### Content Metrics
- Total tracks, albums, playlists, posts
- Upload trends

### Engagement
- Total plays, likes, comments, follows
- Average plays per track
- Engagement rate

### Plan Distribution
- Users per plan tier
- Percentage breakdown
- Pie chart visualization

### Revenue
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Churn rate

### Top Creators
- Ranked by followers, plays, or engagement
- View creator statistics

### Data Export
- Export analytics to CSV
- Select specific metrics
- Download for external analysis

## Best Practices

### Security
- Review security events daily
- Investigate critical events immediately
- Audit admin actions regularly
- Terminate suspicious sessions

### User Management
- Document suspension reasons
- Communicate before major actions
- Monitor unusual behavior

### Configuration
- Test changes in staging first
- Document all config updates
- Review rate limits regularly

### Performance
- Monitor slow queries weekly
- Clear cache during low-traffic periods
- Review error logs daily

## Troubleshooting

### Cannot Access Dashboard
- Verify admin role
- Check login status
- Clear browser cache

### Changes Not Saving
- Check error messages
- Verify permissions
- Check network connection

### Data Not Loading
- Check system health
- Verify database connection
- Clear cache and reload

## Related Documentation

- [Architecture Overview](guide-architecture.md)
- [Database Schema](guide-database-schema.md)
- [Security Design](../security/security-design.md)
