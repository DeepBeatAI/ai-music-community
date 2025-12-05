# Moderation System Documentation

## Overview

The Moderation System provides comprehensive content and user moderation capabilities for the AI Music Community Platform. It enables users to report violations, moderators to review and take action, and administrators to monitor moderation activities.

## Key Features

- **User Reporting**: Users can report posts, comments, tracks, and profiles that violate community guidelines
- **Moderator Dashboard**: Dedicated interface at `/moderation` for reviewing reports and taking actions
- **Automated Priority**: Reports are automatically prioritized based on violation severity
- **Flexible Actions**: Multiple action types including warnings, restrictions, suspensions, and bans
- **Audit Trail**: Comprehensive logging of all moderation actions for accountability
- **Notification System**: Automatic notifications to users when actions are taken
- **Rate Limiting**: Prevents abuse of the reporting system

## Documentation Index

### For Users

**Getting Started:**
- [User Reporting Guide](guides/guide-user-reporting.md) - How to report content that violates guidelines
- [Community Guidelines](guides/guide-community-guidelines.md) - Complete rules and standards for the platform
- [Moderation FAQ](guides/guide-moderation-faq.md) - Frequently asked questions about moderation
- [User Safety Guide](guides/guide-user-safety.md) - Tips for staying safe on the platform

**Quick Links:**
- [How to Report Content](guides/guide-user-reporting.md#how-to-report-content)
- [What Happens After Reporting](guides/guide-user-reporting.md#what-happens-after-you-report)
- [Report Rate Limits](guides/guide-user-reporting.md#report-rate-limits)
- [Content Standards](guides/guide-community-guidelines.md#content-standards)
- [AI-Generated Content Requirements](guides/guide-community-guidelines.md#ai-generated-content-requirements)

### For Moderators

**Training and Reference:**
- [Moderator Training Guide](guides/guide-moderator-training.md) - Complete training for moderators
- [API Reference](guides/guide-api-reference.md) - Technical documentation for moderation functions

**Quick Links:**
- [Moderation Dashboard Overview](guides/guide-moderator-training.md#moderation-dashboard-overview)
- [Taking Moderation Actions](guides/guide-moderator-training.md#taking-moderation-actions)
- [Best Practices](guides/guide-moderator-training.md#moderation-best-practices)

### For Developers

**Technical Documentation:**
- [API Reference](guides/guide-api-reference.md) - Complete API documentation for moderation services
- [Database Schema](../../database/guides/guide-moderation-schema.md) - Moderation tables and relationships
- [Integration Guide](guides/guide-integration.md) - Integrating moderation into features

**Implementation Details:**
- Database tables: `moderation_reports`, `moderation_actions`, `user_restrictions`
- Service layer: `client/src/lib/moderationService.ts`
- UI components: `client/src/components/moderation/`
- Database functions: `can_user_post()`, `can_user_comment()`, `can_user_upload()`

## System Architecture

### High-Level Overview

```
User Reports → Moderation Queue → Moderator Review → Action Taken → User Notified
                                                    ↓
                                              Audit Log
```

### Key Components

1. **Reporting System**
   - Report button on all content types
   - Report modal with violation categories
   - Rate limiting (10 reports per 24 hours)
   - Automatic priority calculation

2. **Moderation Dashboard** (`/moderation`)
   - Queue Tab: Review pending reports
   - Action Logs Tab: View moderation history
   - Metrics Tab: Monitor moderation statistics
   - Settings Tab: Configure preferences

3. **Action System**
   - Content actions: Remove, hide, approve
   - User actions: Warn, suspend, restrict, ban
   - Automatic notification delivery
   - Comprehensive audit logging

4. **Restriction Enforcement**
   - API-level checks before actions
   - Database functions for validation
   - Automatic expiration handling
   - Clear error messages to users

## Report Categories

| Category | Priority | Description |
|----------|----------|-------------|
| Self-Harm or Dangerous Acts | P1 (Critical) | Content promoting self-harm or dangerous behavior |
| Hate Speech | P2 (High) | Content promoting hatred or discrimination |
| Harassment or Bullying | P2 (High) | Targeted attacks or intimidation |
| Inappropriate Content | P3 (Standard) | Content violating platform standards |
| Spam or Misleading Content | P3 (Standard) | Repetitive or deceptive content |
| Copyright Violation | P3 (Standard) | Unauthorized use of copyrighted material |
| Impersonation | P3 (Standard) | Fake accounts or identity theft |
| Other | P4 (Low) | Other violations requiring review |

## Moderation Actions

### Content Actions

- **Remove Content**: Permanently delete content
- **Hide Content**: Temporarily hide during review
- **Approve Content**: Dismiss report, no violation found

### User Actions

- **Issue Warning**: Notify user of violation
- **Temporary Suspension**: Suspend account (1, 7, or 30 days)
- **Apply Restriction**: Disable specific capabilities
  - Posting disabled
  - Commenting disabled
  - Uploading disabled
- **Permanent Ban**: Remove user from platform (admin only)

## Access Control

### User Roles

- **Users**: Can report content, view own reports
- **Moderators**: Can review reports, take actions (except bans)
- **Admins**: Full access including permanent bans

### Permissions

| Action | User | Moderator | Admin |
|--------|------|-----------|-------|
| Report content | ✅ | ✅ | ✅ |
| Flag content | ❌ | ✅ | ✅ |
| View queue | ❌ | ✅ | ✅ |
| Take actions | ❌ | ✅ | ✅ |
| Permanent ban | ❌ | ❌ | ✅ |
| View all logs | ❌ | ✅ | ✅ |
| Export logs | ❌ | ❌ | ✅ |

## Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Server-side Authorization**: All actions verified server-side
- **Input Validation**: Prevents SQL injection and XSS
- **Rate Limiting**: Prevents automated abuse
- **Audit Logging**: Complete action history
- **Failed Attempt Logging**: Security event tracking

## Integration Points

### Existing Systems

- **User Roles**: Uses existing `user_roles` table
- **Admin Dashboard**: Integrates with `/admin` dashboard
- **Suspension System**: Uses existing `suspendUser()` function
- **Notification System**: Delivers moderation notifications
- **Audit Logging**: Integrates with `admin_audit_log`

### API Endpoints

All moderation functions are available through `moderationService.ts`:

```typescript
// User reporting
submitReport(params: ReportParams)

// Moderator flagging
moderatorFlagContent(params: ModeratorFlagParams)

// Queue management
fetchModerationQueue(filters: QueueFilters)

// Taking actions
takeModerationAction(params: ModerationActionParams)

// Restriction management
applyRestriction(userId, restrictionType, reason, durationDays?)
checkUserRestrictions(userId)
```

## Database Schema

### Core Tables

**moderation_reports**
- Stores all user and moderator reports
- Tracks status, priority, and resolution
- Links to reported content and users

**moderation_actions**
- Logs all moderation actions taken
- Records moderator, target, and details
- Tracks notifications and outcomes

**user_restrictions**
- Manages active user restrictions
- Supports time-based expiration
- Links to moderation actions

### Helper Functions

- `can_user_post(user_id)` - Check posting permission
- `can_user_comment(user_id)` - Check commenting permission
- `can_user_upload(user_id)` - Check upload permission
- `get_user_restrictions(user_id)` - Get active restrictions
- `expire_restrictions()` - Auto-expire old restrictions
- `expire_suspensions()` - Auto-expire old suspensions

## Metrics and Analytics

### Available Metrics

- Reports received (today/week/month)
- Reports resolved and resolution time
- Actions by type breakdown
- Top report reasons
- Moderator performance (admin only)
- SLA compliance rates

### Monitoring

- Real-time queue status
- Action log tracking
- Performance metrics
- Security event monitoring

## Future Enhancements

### Planned Features

- **Appeal System**: Formal process for appealing moderation decisions
- **Reporter Notifications**: Notify reporters of outcomes
- **Collaborative Playlists**: Moderation for shared playlists
- **Advanced Analytics**: Trend analysis and pattern detection
- **Automated Detection**: AI-assisted content flagging
- **Escalation System**: Automatic escalation for critical issues

### Under Consideration

- Community moderators program
- Reputation system for reporters
- Moderation transparency reports
- User education programs
- Proactive content scanning

## Support and Resources

### Getting Help

**For Users:**
- Review [Community Guidelines](guides/guide-community-guidelines.md)
- Check [Moderation FAQ](guides/guide-moderation-faq.md)
- Contact support through Help Center

**For Moderators:**
- Review [Moderator Training Guide](guides/guide-moderator-training.md)
- Check [API Reference](guides/guide-api-reference.md)
- Contact admin team for escalations

**For Developers:**
- Review [API Reference](guides/guide-api-reference.md)
- Check implementation in `client/src/lib/moderationService.ts`
- Review database migrations in `supabase/migrations/`

### Contact Information

- **Support Email**: support@aimusiccommunity.com (example)
- **Help Center**: Available in platform
- **Documentation**: This directory

## Version History

### Current Version: 1.0 (December 2025)

**Features:**
- Complete user reporting system
- Moderator dashboard with queue, logs, metrics, and settings
- Flexible action system with multiple restriction types
- Automated priority and notification system
- Comprehensive audit logging
- Integration with existing admin systems

**Recent Updates:**
- Initial release of moderation system
- User-facing documentation completed
- Moderator training materials created
- API reference documentation published

---

## Quick Start

### For Users

1. See content that violates guidelines? Click the **🚩 report button**
2. Select the violation category
3. Provide details if needed
4. Submit your report

Learn more: [User Reporting Guide](guides/guide-user-reporting.md)

### For Moderators

1. Access the moderation dashboard at `/moderation`
2. Review reports in the Queue tab
3. Take appropriate actions based on guidelines
4. Monitor metrics and logs

Learn more: [Moderator Training Guide](guides/guide-moderator-training.md)

### For Developers

1. Review [API Reference](guides/guide-api-reference.md)
2. Check database schema and migrations
3. Integrate moderation checks into features
4. Test with existing test suites

---

*For questions or feedback about the moderation system, contact the platform team.*
