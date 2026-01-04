/**
 * Unit tests for evidence verification data storage
 * Requirements: 9.6, 9.7
 * 
 * Tests:
 * - Storing evidenceVerified = true
 * - Storing evidenceVerified = false
 * - Storing verification notes
 * - Validation of notes length (max 500 chars)
 * - Null/undefined handling
 */

import { takeModerationAction } from '../moderationService';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-moderator-id', email: 'moderator@test.com' },
  }),
}));

describe('Evidence Verification Data Storage', () => {
  let mockSupabase: any;
  let mockInsert: jest.Mock;
  let mockSelect: jest.Mock;
  let mockSingle: jest.Mock;
  let mockFrom: jest.Mock;

  // Valid UUIDs for testing
  const TEST_REPORT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TEST_MODERATOR_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440002';
  const TEST_TRACK_ID = '550e8400-e29b-41d4-a716-446655440003';
  const TEST_ACTION_ID = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock chain
    mockSingle = jest.fn().mockResolvedValue({
      data: {
        id: TEST_ACTION_ID,
        moderator_id: TEST_MODERATOR_ID,
        target_user_id: TEST_USER_ID,
        action_type: 'content_removed',
        metadata: null,
      },
      error: null,
    });

    mockSelect = jest.fn().mockReturnValue({
      single: mockSingle,
    });

    mockInsert = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    mockFrom = jest.fn().mockReturnValue({
      insert: mockInsert,
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_REPORT_ID, status: 'pending' },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockSupabase = {
      from: mockFrom,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: TEST_MODERATOR_ID, email: 'moderator@test.com' } },
          error: null,
        }),
      },
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Storing evidenceVerified = true', () => {
    it('should store evidenceVerified as true in metadata', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
      });

      // Verify insert was called with correct metadata
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            evidence_verification: expect.objectContaining({
              verified: true,
              verified_by: TEST_MODERATOR_ID,
            }),
          }),
        })
      );
    });

    it('should include verified_at timestamp when evidenceVerified is true', async () => {
      const beforeTime = Date.now();
      
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
      });

      const afterTime = Date.now();

      // Verify metadata includes verified_at
      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.verified_at).toBeDefined();
      const verifiedAtTime = new Date(insertCall.metadata.evidence_verification.verified_at).getTime();
      expect(verifiedAtTime).toBeGreaterThanOrEqual(beforeTime);
      expect(verifiedAtTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Storing evidenceVerified = false', () => {
    it('should store evidenceVerified as false in metadata', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: false,
      });

      // Verify insert was called with correct metadata
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            evidence_verification: expect.objectContaining({
              verified: false,
              verified_by: TEST_MODERATOR_ID,
            }),
          }),
        })
      );
    });

    it('should still include verified_at timestamp when evidenceVerified is false', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: false,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.verified_at).toBeDefined();
    });
  });

  describe('Storing verification notes', () => {
    it('should store verification notes in metadata', async () => {
      const notes = 'Verified copyright claim with original work link';

      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
        verificationNotes: notes,
      });

      // Verify insert was called with correct metadata
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            evidence_verification: expect.objectContaining({
              verified: true,
              notes: notes,
              verified_by: TEST_MODERATOR_ID,
            }),
          }),
        })
      );
    });

    it('should store notes even when evidenceVerified is false', async () => {
      const notes = 'Could not verify evidence - link was broken';

      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: false,
        verificationNotes: notes,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.notes).toBe(notes);
    });

    it('should store notes without evidenceVerified flag', async () => {
      const notes = 'Additional context about the evidence';

      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        verificationNotes: notes,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.notes).toBe(notes);
      expect(insertCall.metadata.evidence_verification.verified).toBe(false); // defaults to false
    });
  });

  describe('Validation of notes length (max 500 chars)', () => {
    it('should accept notes with exactly 500 characters', async () => {
      const notes = 'a'.repeat(500);

      await expect(
        takeModerationAction({
          reportId: TEST_REPORT_ID,
          actionType: 'content_removed',
          reason: 'copyright',
          targetUserId: TEST_USER_ID,
          targetType: 'track',
          targetId: TEST_TRACK_ID,
          verificationNotes: notes,
        })
      ).resolves.not.toThrow();
    });

    it('should reject notes with more than 500 characters', async () => {
      const notes = 'a'.repeat(501);

      await expect(
        takeModerationAction({
          reportId: TEST_REPORT_ID,
          actionType: 'content_removed',
          reason: 'copyright',
          targetUserId: TEST_USER_ID,
          targetType: 'track',
          targetId: TEST_TRACK_ID,
          verificationNotes: notes,
        })
      ).rejects.toThrow('Verification notes must be 500 characters or less');
    });

    it('should accept notes with less than 500 characters', async () => {
      const notes = 'Short verification note';

      await expect(
        takeModerationAction({
          reportId: TEST_REPORT_ID,
          actionType: 'content_removed',
          reason: 'copyright',
          targetUserId: TEST_USER_ID,
          targetType: 'track',
          targetId: TEST_TRACK_ID,
          verificationNotes: notes,
        })
      ).resolves.not.toThrow();
    });

    it('should accept empty string for notes', async () => {
      await expect(
        takeModerationAction({
          reportId: TEST_REPORT_ID,
          actionType: 'content_removed',
          reason: 'copyright',
          targetUserId: TEST_USER_ID,
          targetType: 'track',
          targetId: TEST_TRACK_ID,
          verificationNotes: '',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Null/undefined handling', () => {
    it('should not include evidence_verification in metadata when both fields are undefined', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        // No evidenceVerified or verificationNotes
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata).toBeNull();
    });

    it('should set notes to null when verificationNotes is undefined', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
        // No verificationNotes
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.notes).toBeNull();
    });

    it('should handle null verificationNotes gracefully', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
        verificationNotes: null as any,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.notes).toBeNull();
    });

    it('should default evidenceVerified to false when undefined', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        verificationNotes: 'Some notes',
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification.verified).toBe(false);
    });

    it('should handle empty string verificationNotes', async () => {
      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
        verificationNotes: '',
      });

      // Empty string should not trigger validation error
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('Combined scenarios', () => {
    it('should store both evidenceVerified and verificationNotes together', async () => {
      const notes = 'Verified with original work link and proof of ownership';

      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        evidenceVerified: true,
        verificationNotes: notes,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      expect(insertCall.metadata.evidence_verification).toEqual({
        verified: true,
        notes: notes,
        verified_at: expect.any(String),
        verified_by: TEST_MODERATOR_ID,
      });
    });

    it('should sanitize verification notes before storage', async () => {
      const notes = '<script>alert("xss")</script>Legitimate notes';

      await takeModerationAction({
        reportId: TEST_REPORT_ID,
        actionType: 'content_removed',
        reason: 'copyright',
        targetUserId: TEST_USER_ID,
        targetType: 'track',
        targetId: TEST_TRACK_ID,
        verificationNotes: notes,
      });

      const insertCall = mockInsert.mock.calls[0][0];
      // Notes should be sanitized (script tags removed)
      expect(insertCall.metadata.evidence_verification.notes).not.toContain('<script>');
    });
  });
});
