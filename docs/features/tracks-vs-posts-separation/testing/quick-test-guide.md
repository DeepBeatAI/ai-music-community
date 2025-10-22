# Quick Test Guide - What You Can Actually Test

## 🎯 5-Minute Essential Tests

### Test 1: Upload Audio and Create Post
1. Go to upload page
2. Select an MP3 file (< 50MB)
3. Add a caption
4. Click "Post"
5. ✅ **Verify**: Post appears in feed with audio player

### Test 2: Play Audio from Post
1. Find your audio post in feed
2. Click play button
3. ✅ **Verify**: Audio plays correctly

### Test 3: Add to Playlist
1. Click "Add to Playlist" on your audio post
2. Select a playlist (or create new one)
3. Go to playlist page
4. ✅ **Verify**: Track appears in playlist and plays

### Test 4: Create Second Post (Track Reuse)
1. Upload the SAME audio file again
2. Add different caption
3. Click "Post"
4. ✅ **Verify**: Both posts work, audio plays in both

### Test 5: Delete Post, Track Remains
1. Delete one of your audio posts
2. Check the other post with same audio
3. ✅ **Verify**: Other post still works and plays audio

---

## 📋 15-Minute Comprehensive Tests

### Audio Upload Tests
- [ ] Upload MP3 file (< 50MB)
- [ ] Upload WAV file
- [ ] Upload FLAC file
- [ ] Try uploading file > 50MB (should fail)
- [ ] Try uploading non-audio file (should fail)

### Post Display Tests
- [ ] Audio post appears in feed
- [ ] Waveform displays correctly
- [ ] Play/pause controls work
- [ ] Progress bar works
- [ ] Duration displays correctly

### Playlist Tests
- [ ] Create new playlist
- [ ] Add track from post to playlist
- [ ] View playlist page
- [ ] Play tracks from playlist
- [ ] Tracks play in correct order
- [ ] Remove track from playlist

### Track Reuse Tests
- [ ] Create post with audio
- [ ] Create second post with same audio
- [ ] Both posts display correctly
- [ ] Both posts play audio correctly
- [ ] Delete first post
- [ ] Second post still works

### Compression Tests (if visible in UI)
- [ ] Upload large audio file
- [ ] Check if compression info displays
- [ ] Verify file size reduction shown
- [ ] Verify compression ratio shown

---

## 🔍 Database Verification Tests

### Check Track Creation
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  title,
  file_url,
  duration,
  file_size,
  compression_applied,
  compression_ratio,
  original_file_size,
  created_at
FROM tracks 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected**: See your uploaded tracks with metadata

### Check Post-Track Relationship
```sql
-- Run in Supabase SQL Editor
SELECT 
  p.id as post_id,
  p.content as caption,
  p.track_id,
  t.title as track_title,
  t.file_url
FROM posts p
JOIN tracks t ON p.track_id = t.id
WHERE p.user_id = 'YOUR_USER_ID' 
  AND p.post_type = 'audio'
ORDER BY p.created_at DESC;
```

**Expected**: See your posts linked to tracks

### Check Playlist-Track Relationship
```sql
-- Run in Supabase SQL Editor
SELECT 
  pl.name as playlist_name,
  t.title as track_title,
  pt.position,
  pt.added_at
FROM playlists pl
JOIN playlist_tracks pt ON pl.id = pt.playlist_id
JOIN tracks t ON pt.track_id = t.id
WHERE pl.user_id = 'YOUR_USER_ID'
ORDER BY pl.name, pt.position;
```

**Expected**: See tracks in your playlists

### Check Track Reuse
```sql
-- Run in Supabase SQL Editor
SELECT 
  t.id as track_id,
  t.title as track_title,
  COUNT(p.id) as post_count
FROM tracks t
LEFT JOIN posts p ON t.id = p.track_id
WHERE t.user_id = 'YOUR_USER_ID'
GROUP BY t.id, t.title
HAVING COUNT(p.id) > 1
ORDER BY post_count DESC;
```

**Expected**: See tracks used in multiple posts

---

## ❌ What You CANNOT Test (Not Implemented)

### Track Library UI (Future Feature)
- ❌ Browse all tracks in a library view
- ❌ Upload track without creating post
- ❌ Edit track metadata from UI
- ❌ Delete track from UI
- ❌ Search tracks in library
- ❌ Filter tracks by date/size/format
- ❌ Change track privacy from UI

### Advanced Features (Future)
- ❌ Select existing track when creating new post
- ❌ Track analytics dashboard
- ❌ Track collections/albums
- ❌ Bulk track operations
- ❌ Track sharing (direct links)

**Note**: These features are planned but not yet implemented. The backend API supports them, but the UI doesn't exist yet.

---

## 🐛 Common Issues and Solutions

### Issue: Audio doesn't play
**Solution**: 
- Check browser console for errors
- Verify file uploaded successfully
- Check if file format is supported (MP3, WAV, FLAC)
- Try refreshing the page

### Issue: Compression info not showing
**Solution**: 
- Compression info may not be visible in all UI components
- Check database directly to verify compression was applied
- Some files may not be compressed (already optimal)

### Issue: Can't find uploaded track
**Solution**: 
- Track Library UI not implemented yet
- Check your posts - track is attached to post
- Use database query to verify track exists

### Issue: Playlist doesn't show track
**Solution**: 
- Verify track was added (check success message)
- Refresh playlist page
- Check database to verify playlist_tracks entry

---

## ✅ Success Criteria

After testing, you should be able to confirm:

1. ✅ Audio uploads successfully
2. ✅ Posts with audio display correctly
3. ✅ Audio plays from posts
4. ✅ Tracks can be added to playlists
5. ✅ Audio plays from playlists
6. ✅ Same audio can be used in multiple posts
7. ✅ Deleting post doesn't break other posts with same audio
8. ✅ Compression is applied (check database)
9. ✅ Track metadata is stored correctly
10. ✅ No errors in browser console

---

## 📞 Need Help?

### Check Documentation
- **Full Manual Testing Guide**: `manual-testing-guide.md`
- **Implementation Scope**: `implementation-scope.md`
- **Performance Testing**: `performance-testing-guide.md`
- **Security Testing**: `security-testing-guide.md`

### Database Access
- Open Supabase Dashboard
- Go to SQL Editor
- Run verification queries above
- Check Table Editor for visual inspection

### Browser Console
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Check Application tab for storage issues

---

**Estimated Testing Time**:
- Essential Tests: 5 minutes
- Comprehensive Tests: 15 minutes
- Database Verification: 5 minutes
- **Total**: ~25 minutes

*Last Updated: January 2025*
