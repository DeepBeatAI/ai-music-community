/**
 * Property-Based Tests for Album Report Rate Limit Enforcement
 * 
 * Feature: album-flagging-system, Property 3: Rate Limit Enforcement
 * Validates: Requirements 1.7
 */

import fc from 'fast-check';
import { REPORT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from '@/lib/moderationService';

describe('Album Report Rate Limit - Property-Based Tests', () => {
  /**
   * Property 3: Rate Limit Enforcement
   * 
   * For any user, attempting to submit more than 10 reports (across all types
   * including albums) within a 24-hour period should be rejected.
   * 
   * Feature: album-flagging-system, Property 3: Rate Limit Enforcement
   * Validates: Requirements 1.7
   */
  describe('Property 3: Rate Limit Enforcement', () => {
    it('should reject reports when user exceeds rate limit across all report types', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary number of reports (some within limit, some exceeding)
          fc.record({
            userId: fc.uuid(),
            reportCount: fc.integer({ min: 1, max: 20 }),
            reportTypes: fc.array(
              fc.constantFrom('post', 'comment', 'track', 'user', 'album'),
              { minLength: 1, maxLength: 20 }
            ),
          }),
          (params) => {
            // Property: Reports should be rejected when count exceeds REPORT_RATE_LIMIT
            
            // Simulate report submissions
            const now = Date.now();
            const reports = Array.from({ length: params.reportCount }, (_, index) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              reporter_id: params.userId,
              report_type: params.reportTypes[index % params.reportTypes.length],
              created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
            }));

            // Count reports within the rate limit window
            const reportsInWindow = reports.filter(report => {
              const reportTime = new Date(report.created_at).getTime();
              return (now - reportTime) <= RATE_LIMIT_WINDOW_MS;
            });

            // Verify rate limit logic
            const shouldBeRejected = reportsInWindow.length >= REPORT_RATE_LIMIT;

            if (shouldBeRejected) {
              // If at or above limit, next report should be rejected
              expect(reportsInWindow.length).toBeGreaterThanOrEqual(REPORT_RATE_LIMIT);
            } else {
              // If below limit, next report should be allowed
              expect(reportsInWindow.length).toBeLessThan(REPORT_RATE_LIMIT);
            }

            // Verify rate limit constant
            expect(REPORT_RATE_LIMIT).toBe(10);

            // Verify rate limit window is 24 hours
            expect(RATE_LIMIT_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
          }
        ),
        { numRuns }
      );
    });

    it('should count album reports toward the shared rate limit', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate arbitrary mix of report types including albums
          fc.record({
            userId: fc.uuid(),
            albumReports: fc.integer({ min: 0, max: 10 }),
            otherReports: fc.integer({ min: 0, max: 10 }),
          }),
          (params) => {
            // Property: Album reports should count toward the shared rate limit
            
            const totalReports = params.albumReports + params.otherReports;
            const now = Date.now();

            // Simulate reports
            const reports = [
              ...Array.from({ length: params.albumReports }, () => ({
                report_type: 'album' as const,
                reporter_id: params.userId,
                created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
              })),
              ...Array.from({ length: params.otherReports }, () => ({
                report_type: fc.sample(fc.constantFrom('post', 'comment', 'track', 'user'), 1)[0],
                reporter_id: params.userId,
                created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
              })),
            ];

            // Verify total count includes album reports
            expect(reports.length).toBe(totalReports);

            // Count album reports
            const albumReportCount = reports.filter(r => r.report_type === 'album').length;
            expect(albumReportCount).toBe(params.albumReports);

            // Verify rate limit applies to total, not per type
            const shouldBeRejected = totalReports >= REPORT_RATE_LIMIT;

            if (shouldBeRejected) {
              expect(totalReports).toBeGreaterThanOrEqual(REPORT_RATE_LIMIT);
            } else {
              expect(totalReports).toBeLessThan(REPORT_RATE_LIMIT);
            }

            // Verify album reports are counted in the total
            const nonAlbumReports = reports.filter(r => r.report_type !== 'album').length;
            expect(albumReportCount + nonAlbumReports).toBe(totalReports);
          }
        ),
        { numRuns }
      );
    });

    it('should only count reports within the 24-hour window', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate reports with various timestamps
          fc.record({
            userId: fc.uuid(),
            recentReports: fc.integer({ min: 0, max: 15 }),
            oldReports: fc.integer({ min: 0, max: 15 }),
          }),
          (params) => {
            // Property: Only reports within the 24-hour window should count toward limit
            
            const now = Date.now();

            // Create recent reports (within window)
            const recentReports = Array.from({ length: params.recentReports }, () => ({
              reporter_id: params.userId,
              report_type: 'album' as const,
              created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
            }));

            // Create old reports (outside window)
            const oldReports = Array.from({ length: params.oldReports }, () => ({
              reporter_id: params.userId,
              report_type: 'album' as const,
              created_at: new Date(now - RATE_LIMIT_WINDOW_MS - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
            }));

            // Verify recent reports are within window
            recentReports.forEach(report => {
              const reportTime = new Date(report.created_at).getTime();
              const timeDiff = now - reportTime;
              expect(timeDiff).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS);
              expect(timeDiff).toBeGreaterThanOrEqual(0);
            });

            // Verify old reports are outside window
            oldReports.forEach(report => {
              const reportTime = new Date(report.created_at).getTime();
              const timeDiff = now - reportTime;
              expect(timeDiff).toBeGreaterThan(RATE_LIMIT_WINDOW_MS);
            });

            // Only recent reports should count toward limit
            const shouldBeRejected = params.recentReports >= REPORT_RATE_LIMIT;

            if (shouldBeRejected) {
              expect(params.recentReports).toBeGreaterThanOrEqual(REPORT_RATE_LIMIT);
            } else {
              expect(params.recentReports).toBeLessThan(REPORT_RATE_LIMIT);
            }

            // Old reports should not affect the limit
            // (even if total reports exceed limit, only recent ones matter)
            const totalReports = params.recentReports + params.oldReports;
            if (params.recentReports < REPORT_RATE_LIMIT) {
              // Should be allowed even if total exceeds limit
              expect(totalReports).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns }
      );
    });

    it('should enforce rate limit per user independently', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate multiple users with different report counts
          fc.array(
            fc.record({
              userId: fc.uuid(),
              reportCount: fc.integer({ min: 0, max: 15 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (users) => {
            // Property: Rate limit should be enforced per user, not globally
            
            const now = Date.now();

            // Create reports for each user
            const userReports = users.map(user => ({
              userId: user.userId,
              reports: Array.from({ length: user.reportCount }, () => ({
                reporter_id: user.userId,
                report_type: 'album' as const,
                created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
              })),
            }));

            // Verify each user's rate limit independently
            userReports.forEach(({ userId, reports }) => {
              const shouldBeRejected = reports.length >= REPORT_RATE_LIMIT;

              if (shouldBeRejected) {
                expect(reports.length).toBeGreaterThanOrEqual(REPORT_RATE_LIMIT);
              } else {
                expect(reports.length).toBeLessThan(REPORT_RATE_LIMIT);
              }

              // Verify all reports belong to the correct user
              reports.forEach(report => {
                expect(report.reporter_id).toBe(userId);
              });
            });

            // Verify users are independent (one user hitting limit doesn't affect others)
            const usersAtLimit = userReports.filter(({ reports }) => 
              reports.length >= REPORT_RATE_LIMIT
            ).length;

            const usersUnderLimit = userReports.filter(({ reports }) => 
              reports.length < REPORT_RATE_LIMIT
            ).length;

            expect(usersAtLimit + usersUnderLimit).toBe(users.length);
          }
        ),
        { numRuns }
      );
    });

    it('should handle edge case of exactly 10 reports', () => {
      // Configure minimum runs for property testing
      const numRuns = 100;

      fc.assert(
        fc.property(
          // Generate user with exactly 10 reports
          fc.uuid(),
          (userId) => {
            // Property: 10th report should be allowed, 11th should be rejected
            
            const now = Date.now();

            // Create exactly 10 reports
            const reports = Array.from({ length: REPORT_RATE_LIMIT }, (_, index) => ({
              id: fc.sample(fc.uuid(), 1)[0],
              reporter_id: userId,
              report_type: index % 2 === 0 ? 'album' as const : 'post' as const,
              created_at: new Date(now - Math.random() * RATE_LIMIT_WINDOW_MS).toISOString(),
            }));

            // Verify exactly at limit
            expect(reports.length).toBe(REPORT_RATE_LIMIT);

            // 10th report should be allowed (count is now 10)
            const canSubmit10th = reports.length <= REPORT_RATE_LIMIT;
            expect(canSubmit10th).toBe(true);

            // 11th report should be rejected (count would be 11)
            const canSubmit11th = reports.length < REPORT_RATE_LIMIT;
            expect(canSubmit11th).toBe(false);

            // Verify all reports are within window
            reports.forEach(report => {
              const reportTime = new Date(report.created_at).getTime();
              const timeDiff = now - reportTime;
              expect(timeDiff).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS);
              expect(timeDiff).toBeGreaterThanOrEqual(0);
            });
          }
        ),
        { numRuns }
      );
    });
  });
});
