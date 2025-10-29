/**
 * Unit Tests for Analytics Query API Functions
 * 
 * Tests the analytics API functions including:
 * - fetchMetrics with date range
 * - fetchMetrics with category filtering
 * - fetchCurrentMetrics data transformation
 * - fetchActivityData grouping logic
 * 
 * Requirements: 9.1, 9.2, 9.4
 */

// NOTE: This test is for the old daily metrics analytics system
// The new trending/popular analytics is in a separate module
// TODO: Update this test or create new tests for trending analytics
// import { 
//   fetchMetrics, 
//   fetchCurrentMetrics, 
//   fetchActivityData,
//   triggerMetricCollection,
//   getCollectionStatus
// } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

describe.skip('Analytics Query API Functions (OLD SYSTEM - SKIPPED)', () => {
  describe('fetchMetrics', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch metrics for a date range', async () => {
      // Setup test data
      const startDate = '2025-01-10';
      const endDate = '2025-01-15';

      // Insert test metrics
      const testMetrics = [
        {
          metric_date: '2025-01-10',
          metric_type: 'count',
          metric_category: 'users_total',
          value: 100,
        },
        {
          metric_date: '2025-01-11',
          metric_type: 'count',
          metric_category: 'users_total',
          value: 105,
        },
        {
          metric_date: '2025-01-12',
          metric_type: 'count',
          metric_category: 'users_total',
          value: 110,
        },
      ];

      // Clean up existing test data
      await supabase
        .from('daily_metrics')
        .delete()
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);

      // Insert test data
      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function
      const result = await fetchMetrics({ startDate, endDate });

      // Verify results
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Verify all results are within date range
      result.forEach(metric => {
        expect(metric.metric_date >= startDate).toBe(true);
        expect(metric.metric_date <= endDate).toBe(true);
      });

      // Verify results are ordered by date ascending
      for (let i = 1; i < result.length; i++) {
        expect(result[i].metric_date >= result[i - 1].metric_date).toBe(true);
      }

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);
    });

    it('should filter metrics by categories', async () => {
      const startDate = '2025-01-10';
      const endDate = '2025-01-15';
      const categories = ['posts_total', 'comments_total'];

      // Setup test data
      const testMetrics = [
        {
          metric_date: '2025-01-10',
          metric_type: 'count',
          metric_category: 'users_total',
          value: 100,
        },
        {
          metric_date: '2025-01-10',
          metric_type: 'count',
          metric_category: 'posts_total',
          value: 50,
        },
        {
          metric_date: '2025-01-10',
          metric_type: 'count',
          metric_category: 'comments_total',
          value: 200,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', startDate);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function with category filter
      const result = await fetchMetrics({ 
        startDate, 
        endDate, 
        categories 
      });

      // Verify results
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(2);

      // Verify all results match the filtered categories
      result.forEach(metric => {
        expect(categories).toContain(metric.metric_category);
      });

      // Verify users_total is not included
      const hasUsersTotal = result.some(m => m.metric_category === 'users_total');
      expect(hasUsersTotal).toBe(false);

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', startDate);
    });

    it('should filter metrics by types', async () => {
      const startDate = '2025-01-10';
      const endDate = '2025-01-15';
      const types = ['count'];

      // Setup test data with different types
      const testMetrics = [
        {
          metric_date: '2025-01-10',
          metric_type: 'count',
          metric_category: 'users_total',
          value: 100,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', startDate);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function with type filter
      const result = await fetchMetrics({ 
        startDate, 
        endDate, 
        types 
      });

      // Verify results
      expect(result).toBeDefined();
      
      // Verify all results match the filtered types
      result.forEach(metric => {
        expect(types).toContain(metric.metric_type);
      });

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', startDate);
    });

    it('should return empty array when no metrics match', async () => {
      const startDate = '2020-01-01';
      const endDate = '2020-01-02';

      // Call the function with date range that has no data
      const result = await fetchMetrics({ startDate, endDate });

      // Should return empty array, not throw error
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid date format
      const invalidParams = {
        startDate: 'invalid-date',
        endDate: '2025-01-15',
      };

      // Should throw an error
      await expect(fetchMetrics(invalidParams)).rejects.toThrow();
    });
  });

  describe('fetchCurrentMetrics', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch and transform current metrics correctly', async () => {
      const testDate = '2025-01-15';

      // Setup test data
      const testMetrics = [
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'users_total',
          value: 150,
        },
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'posts_total',
          value: 75,
        },
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'comments_total',
          value: 300,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function
      const result = await fetchCurrentMetrics();

      // Verify transformation
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('totalComments');

      // Verify values are numbers
      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.totalPosts).toBe('number');
      expect(typeof result.totalComments).toBe('number');

      // Values should be non-negative
      expect(result.totalUsers).toBeGreaterThanOrEqual(0);
      expect(result.totalPosts).toBeGreaterThanOrEqual(0);
      expect(result.totalComments).toBeGreaterThanOrEqual(0);

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);
    });

    it('should return default values when no data exists', async () => {
      // Clean up all metrics to ensure no data
      const futureDate = '2030-01-01';
      
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', futureDate);

      // Call the function (it will query latest, which might not exist)
      const result = await fetchCurrentMetrics();

      // Should return default structure with zero values or actual values
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalPosts');
      expect(result).toHaveProperty('totalComments');
      
      // All values should be numbers
      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.totalPosts).toBe('number');
      expect(typeof result.totalComments).toBe('number');
    });

    it('should handle partial data gracefully', async () => {
      const testDate = '2025-01-16';

      // Setup partial test data (only users_total)
      const testMetrics = [
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'users_total',
          value: 200,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function
      const result = await fetchCurrentMetrics();

      // Should return structure with available data and defaults for missing
      expect(result).toBeDefined();
      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.totalPosts).toBe('number');
      expect(typeof result.totalComments).toBe('number');

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);
    });
  });

  describe('fetchActivityData', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch and group activity data correctly', async () => {
      // Calculate date range (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Setup test data for a few days
      const testDate1 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const testDate2 = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const testMetrics = [
        {
          metric_date: testDate1,
          metric_type: 'count',
          metric_category: 'posts_created',
          value: 10,
        },
        {
          metric_date: testDate1,
          metric_type: 'count',
          metric_category: 'comments_created',
          value: 25,
        },
        {
          metric_date: testDate2,
          metric_type: 'count',
          metric_category: 'posts_created',
          value: 8,
        },
        {
          metric_date: testDate2,
          metric_type: 'count',
          metric_category: 'comments_created',
          value: 30,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .in('metric_category', ['posts_created', 'comments_created']);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function
      const result = await fetchActivityData();

      // Verify results
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Should return data for all 30 days (even if some are zero)
      expect(result.length).toBeGreaterThanOrEqual(30);

      // Verify data structure
      result.forEach(dataPoint => {
        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('posts');
        expect(dataPoint).toHaveProperty('comments');
        expect(typeof dataPoint.posts).toBe('number');
        expect(typeof dataPoint.comments).toBe('number');
        expect(dataPoint.posts).toBeGreaterThanOrEqual(0);
        expect(dataPoint.comments).toBeGreaterThanOrEqual(0);
      });

      // Verify dates are in ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date >= result[i - 1].date).toBe(true);
      }

      // Verify our test data is included
      const testData1 = result.find(d => d.date === testDate1);
      const testData2 = result.find(d => d.date === testDate2);

      expect(testData1).toBeDefined();
      expect(testData2).toBeDefined();

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .in('metric_category', ['posts_created', 'comments_created']);
    });

    it('should initialize missing dates with zero values', async () => {
      // Call the function
      const result = await fetchActivityData();

      // Should have 30+ days of data
      expect(result.length).toBeGreaterThanOrEqual(30);

      // All dates should have numeric values (even if zero)
      result.forEach(dataPoint => {
        expect(typeof dataPoint.posts).toBe('number');
        expect(typeof dataPoint.comments).toBe('number');
      });

      // Should have consecutive dates
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].date);
        const currDate = new Date(result[i].date);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBe(1);
      }
    });

    it('should group posts and comments by date correctly', async () => {
      const testDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Setup test data with specific values
      const testMetrics = [
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'posts_created',
          value: 15,
        },
        {
          metric_date: testDate,
          metric_type: 'count',
          metric_category: 'comments_created',
          value: 45,
        },
      ];

      // Clean up and insert test data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate)
        .in('metric_category', ['posts_created', 'comments_created']);

      await supabase.from('daily_metrics').insert(testMetrics);

      // Call the function
      const result = await fetchActivityData();

      // Find our test date in the results
      const testDataPoint = result.find(d => d.date === testDate);

      expect(testDataPoint).toBeDefined();
      expect(testDataPoint?.posts).toBe(15);
      expect(testDataPoint?.comments).toBe(45);

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate)
        .in('metric_category', ['posts_created', 'comments_created']);
    });
  });

  describe('triggerMetricCollection', () => {
    it('should trigger collection and return results', async () => {
      const testDate = '2025-01-17';

      // Clean up existing data
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);

      // Call the function
      const result = await triggerMetricCollection(testDate);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('metrics_collected');
      expect(result).toHaveProperty('execution_time_ms');
      expect(result).toHaveProperty('status');

      expect(result.metrics_collected).toBe(5);
      expect(result.status).toBe('completed');
      expect(typeof result.execution_time_ms).toBe('number');

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);
        
      await supabase
        .from('metric_collection_log')
        .delete()
        .eq('collection_date', testDate);
    });

    it('should use current date when no date provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Call without date parameter
      const result = await triggerMetricCollection();

      // Should complete successfully
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');

      // Verify metrics were created for today
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('metric_date', today);

      expect(metrics).toBeDefined();
      expect(metrics!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('getCollectionStatus', () => {
    it('should return collection status when logs exist', async () => {
      // Trigger a collection to ensure we have a log entry
      const testDate = '2025-01-18';
      await triggerMetricCollection(testDate);

      // Get the status
      const status = await getCollectionStatus();

      // Verify status structure
      expect(status).toBeDefined();
      
      if (status) {
        expect(status).toHaveProperty('last_run');
        expect(status).toHaveProperty('status');
        expect(status).toHaveProperty('metrics_collected');
        expect(status).toHaveProperty('duration_ms');

        expect(['completed', 'failed', 'running']).toContain(status.status);
        expect(typeof status.metrics_collected).toBe('number');
        expect(typeof status.duration_ms).toBe('number');
      }

      // Clean up
      await supabase
        .from('daily_metrics')
        .delete()
        .eq('metric_date', testDate);
        
      await supabase
        .from('metric_collection_log')
        .delete()
        .eq('collection_date', testDate);
    });

    it('should return null when no logs exist', async () => {
      // This test assumes we can't easily clear all logs
      // So we just verify the function handles the case
      const status = await getCollectionStatus();

      // Should either return a status or null, not throw
      expect(status === null || typeof status === 'object').toBe(true);
    });
  });
});
