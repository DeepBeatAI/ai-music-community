# Production Deployment Checklist: Tracks vs Posts Separation

## Document Information
- **Feature**: Tracks vs Posts Separation
- **Version**: 1.0
- **Created**: January 2025
- **Status**: Ready for Production Deployment

## Overview

This checklist ensures a safe, zero-downtime deployment of the tracks-posts separation feature to production. Follow each step in order and verify completion before proceeding.

---

## Pre-Deployment Phase (1-2 days before)

### 1. Code Review and Testing

- [ ] **All unit tests passing**
  - Run: `npm test` in client directory
  - Expected: 100% pass rate
  - Location: `client/src/__tests__/unit/`

- [ ] **All integration tests passing**
  - Run: `npm run test:integration`
  - Expected: All scenarios pass
  - Location: `client/src/__tests__/integration/`

- [ ] **TypeScript compilation successful**
  - Run: `npm run build` in client directory
  - Expected: No errors, clean build

- [ ] **ESLint checks passing**
  - Run: `npm run lint`
  - Expected: No errors or warnings

- [ ] **Manual testing completed**
  - Audio upload and track creation
  - Post creation with track reference
  - Playlist management with tracks
  - Track reuse across multiple posts
  - Mobile responsiveness verified

### 2. Database Preparation

- [ ] **Backup production database**
  - Create full database backup via Supabase dashboard
  - Download backup file locally
  - Verify backup integrity
  - Document backup timestamp and location

- [ ] **Test migrations on staging/development**
  - Run all 4 migration files in sequence
  - Verify data integrity after each migration
  - Test rollback procedures
  - Document any issues encountered

- [ ] **Verify migration scripts**
  - Review: `20250122000000_prepare_tracks_posts_separation.sql`
  - Review: `20250122000002_migrate_audio_posts_to_tracks.sql`
  - Review: `20250122000003_update_playlist_track_references.sql`
  - Review: `20250122000004_finalize_tracks_posts_separation.sql`
  - Confirm all scripts have proper error handling
  - Confirm all scripts have verification checks

- [ ] **Prepare rollback scripts**
  - Location: `docs/features/tracks-vs-posts-separation/deployment/rollback-procedures.md`
  - Test rollback on development database
  - Verify rollback restores original state

### 3. Environment Configuration

- [ ] **Update environment variables (if needed)**
  - Review `.env.production` settings
  - Verify Supabase connection strings
  - Verify storage bucket configurations
  - No changes expected for this feature

- [ ] **Verify Supabase project settings**
  - Check RLS policies are enabled
  - Verify storage buckets exist
  - Confirm API rate limits
  - Check connection pool settings

### 4. Monitoring Setup

- [ ] **Configure error tracking**
  - Verify Sentry/error tracking is active
  - Add custom error tags for track operations
  - Set up alerts for critical errors
  - Test error reporting

- [ ] **Set up performance monitoring**
  - Configure query performance tracking
  - Set up slow query alerts (>100ms)
  - Monitor database connection pool
  - Track API response times

- [ ] **Create deployment dashboard**
  - Track migration progress
  - Monitor error rates
  - Track user activity
  - Set up real-time alerts

### 5. Communication Preparation

- [ ] **Notify stakeholders**
  - Send deployment notification email
  - Include deployment window
  - Include expected downtime (if any)
  - Provide rollback plan summary

- [ ] **Prepare user communication (if needed)**
  - Draft user announcement (optional)
  - Prepare FAQ for new features
  - Update help documentation
  - No user-facing changes expected initially

- [ ] **Prepare developer changelog**
  - Document breaking changes
  - Provide migration examples
  - Update API documentation
  - Location: `docs/features/tracks-vs-posts-separation/deployment/developer-changelog.md`

---

## Deployment Day

### Phase 1: Pre-Deployment Verification (30 minutes)

- [ ] **Verify production health**
  - Check current error rates (should be <1%)
  - Verify database performance (queries <100ms)
  - Check storage availability
  - Confirm no ongoing incidents

- [ ] **Final backup**
  - Create fresh production database backup
  - Download and verify backup
  - Document backup timestamp
  - Store backup securely

- [ ] **Team readiness**
  - All team members available
  - Communication channels open
  - Rollback procedures reviewed
  - Monitoring dashboards ready

### Phase 2: Code Deployment (15 minutes)

- [ ] **Deploy frontend code**
  - Push code to main branch
  - Trigger Vercel deployment
  - Wait for build completion
  - Verify deployment success

- [ ] **Verify deployment**
  - Check Vercel deployment logs
  - Verify no build errors
  - Check deployment URL is live
  - Test basic page loads

### Phase 3: Database Migration (45-60 minutes)

#### Migration 1: Schema Preparation (5 minutes)

- [ ] **Run migration 20250122000000**
  ```bash
  supabase db push --db-url [PRODUCTION_URL]
  ```
  - Expected duration: 2-3 minutes
  - Adds track_id column to posts
  - Adds indexes
  - Non-breaking change

- [ ] **Verify migration 1**
  ```sql
  -- Check column exists
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'posts' AND column_name = 'track_id';
  
  -- Check index exists
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'posts' AND indexname = 'idx_posts_track_id';
  ```
  - Expected: track_id column exists
  - Expected: Index exists

#### Migration 2: Data Migration (20-30 minutes)

- [ ] **Run migration 20250122000002**
  ```bash
  supabase db push --db-url [PRODUCTION_URL]
  ```
  - Expected duration: 15-25 minutes (depends on data volume)
  - Creates tracks from audio posts
  - Updates posts.track_id references
  - Includes verification checks

- [ ] **Verify migration 2**
  ```sql
  -- Check all audio posts have track_id
  SELECT COUNT(*) as orphaned_posts
  FROM posts
  WHERE post_type = 'audio' AND track_id IS NULL;
  -- Expected: 0
  
  -- Check tracks created
  SELECT COUNT(*) as track_count FROM tracks;
  -- Expected: >= number of audio posts
  
  -- Check track-post mapping
  SELECT COUNT(*) as mapped_posts
  FROM posts p
  JOIN tracks t ON p.track_id = t.id
  WHERE p.post_type = 'audio';
  -- Expected: All audio posts
  ```

#### Migration 3: Playlist References (10-15 minutes)

- [ ] **Run migration 20250122000003**
  ```bash
  supabase db push --db-url [PRODUCTION_URL]
  ```
  - Expected duration: 8-12 minutes
  - Updates playlist_tracks to reference tracks
  - Updates foreign key constraints
  - Includes verification checks

- [ ] **Verify migration 3**
  ```sql
  -- Check all playlist_tracks reference valid tracks
  SELECT COUNT(*) as invalid_refs
  FROM playlist_tracks pt
  WHERE NOT EXISTS (
    SELECT 1 FROM tracks t WHERE t.id = pt.track_id
  );
  -- Expected: 0
  
  -- Check foreign key constraint
  SELECT constraint_name, table_name
  FROM information_schema.table_constraints
  WHERE table_name = 'playlist_tracks' 
    AND constraint_name = 'playlist_tracks_track_id_fkey';
  -- Expected: Constraint exists
  ```

#### Migration 4: Finalization (5 minutes)

- [ ] **Run migration 20250122000004**
  ```bash
  supabase db push --db-url [PRODUCTION_URL]
  ```
  - Expected duration: 2-3 minutes
  - Adds audio_posts_must_have_track constraint
  - Adds performance indexes
  - Marks deprecated columns

- [ ] **Verify migration 4**
  ```sql
  -- Check constraint exists
  SELECT constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'posts' 
    AND constraint_name = 'audio_posts_must_have_track';
  -- Expected: Constraint exists
  
  -- Check indexes
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'tracks';
  -- Expected: idx_tracks_user_id, idx_tracks_created_at, idx_tracks_is_public
  ```

### Phase 4: Post-Deployment Verification (30 minutes)

#### Functional Testing

- [ ] **Test audio upload flow**
  - Upload new audio file
  - Verify track created in database
  - Verify post created with track_id
  - Check audio playback works

- [ ] **Test existing audio posts**
  - Load feed with existing audio posts
  - Verify audio playback works
  - Check track data displays correctly
  - Verify likes/comments still work

- [ ] **Test playlist functionality**
  - View existing playlists
  - Add track to playlist
  - Remove track from playlist
  - Verify playback from playlist

- [ ] **Test track reuse**
  - Create multiple posts with same track
  - Verify both posts work correctly
  - Check track data is shared

#### Performance Testing

- [ ] **Check query performance**
  ```sql
  -- Test post fetch with tracks
  EXPLAIN ANALYZE
  SELECT p.*, t.*
  FROM posts p
  LEFT JOIN tracks t ON p.track_id = t.id
  WHERE p.post_type = 'audio'
  ORDER BY p.created_at DESC
  LIMIT 15;
  -- Expected: <100ms execution time
  ```

- [ ] **Monitor database metrics**
  - Check connection pool usage
  - Verify query response times
  - Check index usage
  - Monitor memory usage

- [ ] **Check API response times**
  - Test /api/posts endpoint
  - Test /api/playlists endpoint
  - Test /api/tracks endpoint (if exists)
  - Expected: <500ms response time

#### Data Integrity Checks

- [ ] **Run comprehensive verification**
  ```sql
  -- Orphaned audio posts
  SELECT COUNT(*) FROM posts 
  WHERE post_type = 'audio' AND track_id IS NULL;
  -- Expected: 0
  
  -- Unreferenced tracks (should be low)
  SELECT COUNT(*) FROM tracks t
  WHERE NOT EXISTS (SELECT 1 FROM posts WHERE track_id = t.id)
    AND NOT EXISTS (SELECT 1 FROM playlist_tracks WHERE track_id = t.id);
  -- Expected: 0 or small number (user library tracks)
  
  -- Invalid playlist references
  SELECT COUNT(*) FROM playlist_tracks pt
  WHERE NOT EXISTS (SELECT 1 FROM tracks WHERE id = pt.track_id);
  -- Expected: 0
  
  -- Track count vs audio post count
  SELECT 
    (SELECT COUNT(*) FROM posts WHERE post_type = 'audio') as audio_posts,
    (SELECT COUNT(*) FROM tracks) as tracks;
  -- Expected: tracks >= audio_posts
  ```

### Phase 5: Monitoring Period (2-4 hours)

- [ ] **Monitor error rates**
  - Check Sentry for new errors
  - Monitor database error logs
  - Check API error rates
  - Expected: <1% error rate

- [ ] **Monitor user activity**
  - Track audio uploads
  - Monitor post creation
  - Check playlist operations
  - Verify normal usage patterns

- [ ] **Monitor performance**
  - Database query times
  - API response times
  - Page load times
  - Storage operations

- [ ] **Check user feedback**
  - Monitor support channels
  - Check for user-reported issues
  - Review social media mentions
  - Address any concerns immediately

---

## Post-Deployment Phase (24-48 hours)

### Day 1 After Deployment

- [ ] **Review deployment metrics**
  - Total migration time
  - Error count during deployment
  - Performance impact
  - User activity levels

- [ ] **Verify data consistency**
  - Run verification queries again
  - Check for any data anomalies
  - Verify no data loss
  - Document any issues

- [ ] **Performance analysis**
  - Compare pre/post deployment metrics
  - Identify any performance regressions
  - Optimize slow queries if needed
  - Update indexes if necessary

- [ ] **User feedback review**
  - Collect user feedback
  - Address any issues
  - Document common questions
  - Update documentation if needed

### Day 2 After Deployment

- [ ] **Final verification**
  - Run full test suite
  - Verify all features working
  - Check edge cases
  - Confirm stability

- [ ] **Documentation updates**
  - Update deployment notes
  - Document lessons learned
  - Update runbooks
  - Share knowledge with team

- [ ] **Cleanup tasks**
  - Remove temporary monitoring
  - Archive deployment logs
  - Update project status
  - Close deployment tickets

---

## Rollback Criteria

**Initiate rollback if:**

1. **Critical errors** affecting >10% of users
2. **Data loss** or corruption detected
3. **Performance degradation** >50% slower
4. **Migration failure** with unrecoverable state
5. **Security vulnerability** discovered

**Rollback procedure:**
- See: `docs/features/tracks-vs-posts-separation/deployment/rollback-procedures.md`
- Expected rollback time: 30-45 minutes
- Requires database restore from backup

---

## Success Criteria

**Deployment is successful when:**

- ✅ All migrations completed without errors
- ✅ All verification queries return expected results
- ✅ Error rate remains <1%
- ✅ Performance meets benchmarks (<100ms queries)
- ✅ All functional tests pass
- ✅ No user-reported critical issues
- ✅ 24-hour monitoring period shows stability

---

## Emergency Contacts

**During Deployment:**
- **Database Admin**: [Contact Info]
- **DevOps Lead**: [Contact Info]
- **Product Owner**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

**Escalation Path:**
1. On-call engineer (immediate)
2. DevOps lead (15 minutes)
3. Database admin (30 minutes)
4. Product owner (1 hour)

---

## Notes and Observations

**Deployment Date**: _________________

**Start Time**: _________________

**End Time**: _________________

**Total Duration**: _________________

**Issues Encountered**:
- 
- 
- 

**Resolutions**:
- 
- 
- 

**Lessons Learned**:
- 
- 
- 

**Next Steps**:
- 
- 
- 

---

*Deployment Checklist Version: 1.0*  
*Created: January 2025*  
*Status: Ready for Use*
