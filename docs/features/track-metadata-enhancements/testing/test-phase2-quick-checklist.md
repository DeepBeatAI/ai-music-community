# Phase 2 Quick Testing Checklist

**Quick reference for Task 2.10 manual testing**

## 5-Minute Smoke Test

### Essential Tests (Must Pass)
- [ ] 1. Upload track with default author (username) → SUCCESS
- [ ] 2. Upload track with custom author → SUCCESS  
- [ ] 3. Try to upload without author → BLOCKED (button disabled)
- [ ] 4. Try to edit author after upload → BLOCKED (read-only)
- [ ] 5. Check author displays in track list → VISIBLE

**If all 5 pass:** Core functionality works ✅

---

## 15-Minute Full Test

### Upload Form (5 min)
- [ ] Author field pre-filled with username
- [ ] Warning icon and text visible
- [ ] Cannot submit without author
- [ ] Can enter 1-100 characters
- [ ] Cannot enter 101+ characters

### Custom Authors (5 min)
- [ ] Default author works
- [ ] Custom author works
- [ ] Cover format works: "Artist (Cover by User)"
- [ ] Collab format works: "Artist A & Artist B"

### Immutability (3 min)
- [ ] Cannot edit author in UI
- [ ] Database trigger blocks updates

### Display (2 min)
- [ ] Shows in track library
- [ ] Shows in audio posts
- [ ] Shows in playlists

---

## Critical Issues to Watch For

### 🚨 Blockers (Must Fix)
- Author field not appearing
- Can upload without author
- Can edit author after upload
- Author not saving to database
- Database errors on upload

### ⚠️ High Priority (Should Fix)
- Warning messages not visible
- Author not displaying in some contexts
- Special characters causing errors
- Performance issues with author field

### 📝 Medium Priority (Nice to Fix)
- Warning tooltip not working
- Helper text unclear
- Display formatting inconsistent

---

## Quick Database Check

```sql
-- Run in Supabase Studio SQL Editor

-- 1. Check all tracks have authors
SELECT COUNT(*) as total_tracks, 
       COUNT(author) as tracks_with_author,
       COUNT(*) - COUNT(author) as missing_authors
FROM tracks;
-- Expected: missing_authors = 0

-- 2. Check author constraints
SELECT column_name, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'tracks' AND column_name = 'author';
-- Expected: is_nullable = 'NO', character_maximum_length = NULL (unlimited but constrained)

-- 3. Check trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'prevent_track_author_update';
-- Expected: 1 row, event_manipulation = 'UPDATE', action_timing = 'BEFORE'

-- 4. Test trigger (should fail)
UPDATE tracks SET author = 'New Author' WHERE id = (SELECT id FROM tracks LIMIT 1);
-- Expected: ERROR: Track author cannot be modified after creation
```

---

## Pass/Fail Criteria

### ✅ PASS
- All 5 essential tests pass
- No critical issues found
- Author displays correctly everywhere
- Database constraints work

### ❌ FAIL
- Any essential test fails
- Critical issues found
- Author can be edited after upload
- Database allows NULL authors

### ⚠️ PASS WITH ISSUES
- Essential tests pass
- Minor display issues
- Non-critical bugs found
- Needs polish but functional

---

## Quick Test Report Template

```
Date: ___________
Tester: ___________

Essential Tests: ☐ 5/5 ☐ 4/5 ☐ 3/5 ☐ <3/5
Full Tests: ☐ All Pass ☐ Most Pass ☐ Some Pass ☐ Many Fail

Critical Issues: ☐ None ☐ 1-2 ☐ 3+
High Priority Issues: ☐ None ☐ 1-2 ☐ 3+

Overall: ☐ PASS ☐ PASS WITH ISSUES ☐ FAIL

Ready for Production: ☐ Yes ☐ No ☐ After Fixes

Notes:
_________________
_________________
```

---

## Next Steps After Testing

### If PASS
1. Mark Task 2.10 as complete
2. Document any minor issues for future improvement
3. Proceed to Phase 3 or deploy Phase 2

### If PASS WITH ISSUES
1. Document all issues found
2. Prioritize fixes
3. Fix high-priority issues
4. Re-test affected areas
5. Mark complete when issues resolved

### If FAIL
1. Document all failures
2. Identify root causes
3. Fix critical issues
4. Run full test suite again
5. Do not proceed until PASS

---

**For detailed testing instructions, see:** `test-phase2-manual-testing-guide.md`
