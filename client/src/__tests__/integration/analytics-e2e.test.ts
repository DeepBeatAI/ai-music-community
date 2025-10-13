/**
 * Integration Test for Analytics End-to-End Flow
 * 
 * Tests the complete analytics workflow including:
 * - Creating test posts and comments
 * - Running metric collection for test date
 * - Verifying metrics match expected counts
 * - Deleting test data
 * - Verifying metrics remain unchanged (immutability test)
 * 
 * Requirements: 1.2, 4.1, 4.2, 4.4
 */

import { supabase } from '@/lib/supabase';
import { triggerMetricCollection, fetchMetrics } from '@/lib/analytics';

describe('Analytics End-to-End Integration', () => {
  const testDate = '2025-01-20';
  let testUserId: string;
  let testPostIds: string[] = [];
  let testCommentIds: string[] = [];

  beforeAll(async () => {
    // Create a test user for our posts and comments
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-analytics-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = authData.user.id;

    // Create user profile
    await supabase.from('user_profiles').insert({
      id: testUserId,
      username: `testuser_${Date.now()}`,
      email: authData.user.email,
    });
  });

  afterAll(async () => {
    // Clean up test user and related data
    if (testUserId) {
      await supabase.from('user_profiles').delete().eq('id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }

    // Clean up test metrics
    await supabase
      .from('daily_metrics')
      .delete()
      .eq('metric_date', testDate);

    await supabase
      .from('metric_collection_log')
      .delete()
      .eq('collection_date', testDate);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    testPostIds = [];
    testCommentIds = [];

    await supabase
      .from('daily_metrics')
      .delete()
      .eq('metric_date', testDate);
  });

  afterEach(async () => {
    // Clean up test posts and comments
    if (testCommentIds.length > 0) {
      await supabase.from('comments').delete().in('id', testCommentIds);
    }
    if (testPostIds.length > 0) {
      await supabase.from('posts').delete().in('id', testPostIds);
    }
  });

  describe('Complete Analytics Workflow', () => {
    it('should collect metrics that match actual data counts', async () => {
      // Step 1: Create test posts
      const postsToCreate = 3;
      const postInserts = [];

      for (let i = 0; i < postsToCreate; i++) {
        postInserts.push({
          user_id: testUserId,
          title: `Test Post ${i + 1}`,
          description: `Test description ${i + 1}`,
          audio_url: `test-audio-${i + 1}.mp3`,
          created_at: `${testDate}T10:${i.toString().padStart(2, '0')}:00Z`,
        });
      }

      const { data: createdPosts, error: postError } = await supabase
        .from('posts')
        .insert(postInserts)
        .select('id');

      expect(postError).toBeNull();
      expect(createdPosts).toHaveLength(postsToCreate);
      testPostIds = createdPosts?.map(p => p.id) || [];

      // Step 2: Create test comments
      const commentsToCreate = 5;
      const commentInserts = [];

      for (let i = 0; i < commentsToCreate; i++) {
        commentInserts.push({
          post_id: testPostIds[i % testPostIds.length],
          user_id: testUserId,
          content: `Test comment ${i + 1}`,
          created_at: `${testDate}T11:${i.toString().padStart(2, '0')}:00Z`,
        });
      }

      const { data: createdComments, error: commentError } = await supabase
        .from('comments')
        .insert(commentInserts)
        .select('id');

      expect(commentError).toBeNull();
      expect(createdComments).toHaveLength(commentsToCreate);
      testCommentIds = createdComments?.map(c => c.id) || [];

      // Step 3: Run metric collection for the test date
      const collectionResult = await triggerMetricCollection(testDate);

      expect(collectionResult).toBeDefined();
      expect(collectionResult.status).toBe('completed');
      expect(collectionResult.metrics_collected).toBe(5);

      // Step 4: Verify metrics match expected counts
      const metrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      expect(metrics).toHaveLength(5);

      // Find specific metrics
      const postsCreatedMetric = metrics.find(
        m => m.metric_category === 'posts_created'
      );
      const commentsCreatedMetric = metrics.find(
        m => m.metric_category === 'comments_created'
      );

      expect(postsCreatedMetric).toBeDefined();
      expect(commentsCreatedMetric).toBeDefined();

      // Verify counts match what we created
      expect(postsCreatedMetric?.value).toBeGreaterThanOrEqual(postsToCreate);
      expect(commentsCreatedMetric?.value).toBeGreaterThanOrEqual(commentsToCreate);

      // Step 5: Store the metric values before deletion
      const metricsBeforeDeletion = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      const metricValuesBeforeDeletion = new Map(
        metricsBeforeDeletion.map(m => [m.metric_category, m.value])
      );

      // Step 6: Delete test data (posts and comments)
      await supabase.from('comments').delete().in('id', testCommentIds);
      await supabase.from('posts').delete().in('id', testPostIds);

      // Verify deletion
      const { data: remainingPosts } = await supabase
        .from('posts')
        .select('id')
        .in('id', testPostIds);

      const { data: remainingComments } = await supabase
        .from('comments')
        .select('id')
        .in('id', testCommentIds);

      expect(remainingPosts).toHaveLength(0);
      expect(remainingComments).toHaveLength(0);

      // Step 7: Verify metrics remain unchanged (immutability test)
      const metricsAfterDeletion = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      expect(metricsAfterDeletion).toHaveLength(5);

      // Verify each metric value is unchanged
      metricsAfterDeletion.forEach(metric => {
        const beforeValue = metricValuesBeforeDeletion.get(metric.metric_category);
        expect(metric.value).toBe(beforeValue);
      });

      // Clear the arrays since we already deleted
      testPostIds = [];
      testCommentIds = [];
    });

    it('should handle re-running collection without creating duplicates', async () => {
      // Create test data
      const { data: post } = await supabase
        .from('posts')
        .insert({
          user_id: testUserId,
          title: 'Test Post for Idempotency',
          description: 'Testing idempotency',
          audio_url: 'test-audio.mp3',
          created_at: `${testDate}T12:00:00Z`,
        })
        .select('id')
        .single();

      testPostIds = post ? [post.id] : [];

      // Run collection first time
      await triggerMetricCollection(testDate);

      const { data: firstMetrics, count: firstCount } = await supabase
        .from('daily_metrics')
        .select('*', { count: 'exact' })
        .eq('metric_date', testDate);

      expect(firstCount).toBe(5);

      // Run collection second time
      await triggerMetricCollection(testDate);

      const { data: secondMetrics, count: secondCount } = await supabase
        .from('daily_metrics')
        .select('*', { count: 'exact' })
        .eq('metric_date', testDate);

      // Should still have exactly 5 metrics (no duplicates)
      expect(secondCount).toBe(5);

      // Verify metric values are consistent
      const firstMetricsMap = new Map(
        firstMetrics?.map(m => [m.metric_category, m.value])
      );
      const secondMetricsMap = new Map(
        secondMetrics?.map(m => [m.metric_category, m.value])
      );

      firstMetricsMap.forEach((value, category) => {
        expect(secondMetricsMap.get(category)).toBe(value);
      });
    });
  });

  describe('Metric Accuracy Validation', () => {
    it('should accurately count posts created on specific date', async () => {
      const expectedPostCount = 4;

      // Create posts on the test date
      const postInserts = Array.from({ length: expectedPostCount }, (_, i) => ({
        user_id: testUserId,
        title: `Accuracy Test Post ${i + 1}`,
        description: `Testing accuracy ${i + 1}`,
        audio_url: `test-audio-${i + 1}.mp3`,
        created_at: `${testDate}T14:${i.toString().padStart(2, '0')}:00Z`,
      }));

      const { data: posts } = await supabase
        .from('posts')
        .insert(postInserts)
        .select('id');

      testPostIds = posts?.map(p => p.id) || [];

      // Run collection
      await triggerMetricCollection(testDate);

      // Verify the count
      const metrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
        categories: ['posts_created'],
      });

      const postsCreatedMetric = metrics.find(
        m => m.metric_category === 'posts_created'
      );

      expect(postsCreatedMetric).toBeDefined();
      expect(postsCreatedMetric?.value).toBeGreaterThanOrEqual(expectedPostCount);
    });

    it('should accurately count comments created on specific date', async () => {
      // Create a post first
      const { data: post } = await supabase
        .from('posts')
        .insert({
          user_id: testUserId,
          title: 'Post for Comment Test',
          description: 'Testing comment counting',
          audio_url: 'test-audio.mp3',
          created_at: `${testDate}T15:00:00Z`,
        })
        .select('id')
        .single();

      testPostIds = post ? [post.id] : [];

      const expectedCommentCount = 7;

      // Create comments on the test date
      const commentInserts = Array.from({ length: expectedCommentCount }, (_, i) => ({
        post_id: post!.id,
        user_id: testUserId,
        content: `Accuracy test comment ${i + 1}`,
        created_at: `${testDate}T15:${i.toString().padStart(2, '0')}:00Z`,
      }));

      const { data: comments } = await supabase
        .from('comments')
        .insert(commentInserts)
        .select('id');

      testCommentIds = comments?.map(c => c.id) || [];

      // Run collection
      await triggerMetricCollection(testDate);

      // Verify the count
      const metrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
        categories: ['comments_created'],
      });

      const commentsCreatedMetric = metrics.find(
        m => m.metric_category === 'comments_created'
      );

      expect(commentsCreatedMetric).toBeDefined();
      expect(commentsCreatedMetric?.value).toBeGreaterThanOrEqual(expectedCommentCount);
    });

    it('should accurately count total users, posts, and comments', async () => {
      // Get current totals before our test
      const { count: usersBefore } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: postsBefore } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      const { count: commentsBefore } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true });

      // Run collection
      await triggerMetricCollection(testDate);

      // Get metrics
      const metrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      const usersTotalMetric = metrics.find(m => m.metric_category === 'users_total');
      const postsTotalMetric = metrics.find(m => m.metric_category === 'posts_total');
      const commentsTotalMetric = metrics.find(m => m.metric_category === 'comments_total');

      // Verify totals are reasonable (should match or be close to actual counts)
      expect(usersTotalMetric?.value).toBeGreaterThanOrEqual(usersBefore || 0);
      expect(postsTotalMetric?.value).toBeGreaterThanOrEqual(postsBefore || 0);
      expect(commentsTotalMetric?.value).toBeGreaterThanOrEqual(commentsBefore || 0);
    });
  });

  describe('Data Immutability', () => {
    it('should preserve historical metrics even after source data changes', async () => {
      // Create initial data
      const { data: post } = await supabase
        .from('posts')
        .insert({
          user_id: testUserId,
          title: 'Immutability Test Post',
          description: 'Testing immutability',
          audio_url: 'test-audio.mp3',
          created_at: `${testDate}T16:00:00Z`,
        })
        .select('id')
        .single();

      testPostIds = post ? [post.id] : [];

      // Collect metrics
      await triggerMetricCollection(testDate);

      // Get initial metric values
      const initialMetrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      const initialValues = new Map(
        initialMetrics.map(m => [m.metric_category, m.value])
      );

      // Modify source data (update post title)
      await supabase
        .from('posts')
        .update({ title: 'Updated Title' })
        .eq('id', post!.id);

      // Delete the post
      await supabase.from('posts').delete().eq('id', post!.id);
      testPostIds = [];

      // Get metrics again
      const finalMetrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
      });

      // Verify all metrics remain unchanged
      finalMetrics.forEach(metric => {
        const initialValue = initialValues.get(metric.metric_category);
        expect(metric.value).toBe(initialValue);
      });
    });

    it('should not be affected by data added after collection', async () => {
      // Run collection first (before creating data)
      await triggerMetricCollection(testDate);

      // Get initial metrics
      const initialMetrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
        categories: ['posts_created'],
      });

      const initialPostsCreated = initialMetrics.find(
        m => m.metric_category === 'posts_created'
      )?.value || 0;

      // Create new post with the same date
      const { data: post } = await supabase
        .from('posts')
        .insert({
          user_id: testUserId,
          title: 'Post Added After Collection',
          description: 'Should not affect metrics',
          audio_url: 'test-audio.mp3',
          created_at: `${testDate}T17:00:00Z`,
        })
        .select('id')
        .single();

      testPostIds = post ? [post.id] : [];

      // Get metrics again (without re-running collection)
      const finalMetrics = await fetchMetrics({
        startDate: testDate,
        endDate: testDate,
        categories: ['posts_created'],
      });

      const finalPostsCreated = finalMetrics.find(
        m => m.metric_category === 'posts_created'
      )?.value || 0;

      // Metric should be unchanged
      expect(finalPostsCreated).toBe(initialPostsCreated);
    });
  });
});
