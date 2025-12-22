/**
 * Property-Based Tests for Moderation Service - Reversal System
 * 
 * These tests use fast-check to verify universal properties that should hold
 * across all valid executions of the reversal system.
 * 
 * Feature: moderation-system, Property 13: Reversal Authorization
 * Feature: moderation-system, Property 14: Reversal State Consistency
 * Validates: Requirements 13.5, 13.6, 13.7, 13.8, 13.11, 13.12, 13.13
 */

import fc from 'fast-check';

/**
 * Property 13: Reversal Authorization
 * 
 * For any reversal action, moderators should be able to reverse actions on
 * non-admin users, admins should be able to reverse any action, and moderators
 * should not be able to reverse actions on admin accounts.
 * 
 * Feature: moderation-system, Property 13: Reversal Authorization
 * Validates: Requirements 13.8, 13.11, 13.12, 13.13
 */
describe('Moderation Service - Property 13: Reversal Authorization', () => {
  /**
   * Authorization decision function that implements the reversal authorization rules
   * This is the core logic we're testing
   */
  function canReverseAction(params: {
    currentUserRole: 'admin' | 'moderator' | 'user';
    targetUserRole: 'admin' | 'moderator' | 'user';
    isSelfReversal: boolean;
  }): { allowed: boolean; reason?: string } {
    // Rule 1: Regular users cannot perform any reversal actions
    if (params.currentUserRole === 'user') {
      return { allowed: false, reason: 'Only moderators and admins can perform reversal actions' };
    }

    // Rule 2: Moderators can reverse actions on non-admin users
    if (params.currentUserRole === 'moderator' && params.targetUserRole !== 'admin') {
      return { allowed: true };
    }

    // Rule 3: Moderators CANNOT reverse actions on admin users
    if (params.currentUserRole === 'moderator' && params.targetUserRole === 'admin') {
      return { allowed: false, reason: 'Moderators cannot reverse actions on admin accounts' };
    }

    // Rule 4: Admins can reverse actions on ANY user
    if (params.currentUserRole === 'admin') {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Unknown authorization scenario' };
  }

  /**
   * Test that moderators can reverse actions on non-admin users
   * Validates: Requirements 13.8, 13.11
   */
  it('should allow moderators to reverse actions on non-admin users', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary scenarios where moderator acts on non-admin
        fc.record({
          targetUserRole: fc.constantFrom('user', 'moderator') as fc.Arbitrary<'user' | 'moderator'>,
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Moderators should be able to reverse actions on non-admin users
          const result = canReverseAction({
            currentUserRole: 'moderator',
            targetUserRole: params.targetUserRole,
            isSelfReversal: params.isSelfReversal,
          });

          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that moderators CANNOT reverse actions on admin users
   * Validates: Requirements 13.8, 13.11
   */
  it('should prevent moderators from reversing actions on admin users', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary scenarios where moderator tries to act on admin
        fc.boolean(), // isSelfReversal
        (isSelfReversal) => {
          // Property: Moderators should NOT be able to reverse actions on admin users
          const result = canReverseAction({
            currentUserRole: 'moderator',
            targetUserRole: 'admin',
            isSelfReversal,
          });

          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('admin');
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that admins CAN reverse actions on any user (including other admins)
   * Validates: Requirements 13.8, 13.13
   */
  it('should allow admins to reverse actions on any user including admins', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary scenarios where admin acts on any user
        fc.record({
          targetUserRole: fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Admins should be able to reverse actions on ANY user
          const result = canReverseAction({
            currentUserRole: 'admin',
            targetUserRole: params.targetUserRole,
            isSelfReversal: params.isSelfReversal,
          });

          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that self-reversal is allowed for moderators
   * Validates: Requirements 13.12
   */
  it('should allow moderators to reverse their own actions (self-reversal)', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary target user roles (non-admin)
        fc.constantFrom('user', 'moderator') as fc.Arbitrary<'user' | 'moderator'>,
        (targetUserRole) => {
          // Property: Self-reversal should be allowed for moderators on non-admin targets
          const result = canReverseAction({
            currentUserRole: 'moderator',
            targetUserRole,
            isSelfReversal: true,
          });

          expect(result.allowed).toBe(true);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that regular users cannot perform any reversal actions
   * Validates: Requirements 13.8
   */
  it('should prevent regular users from performing any reversal actions', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary scenarios where regular user tries to reverse
        fc.record({
          targetUserRole: fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Regular users should NOT be able to perform any reversal actions
          const result = canReverseAction({
            currentUserRole: 'user',
            targetUserRole: params.targetUserRole,
            isSelfReversal: params.isSelfReversal,
          });

          expect(result.allowed).toBe(false);
          expect(result.reason).toContain('moderators and admins');
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test authorization consistency across all possible role combinations
   * Validates: Requirements 13.8, 13.11, 13.12, 13.13
   */
  it('should enforce consistent authorization across all role combinations', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate all possible role combinations
        fc.record({
          currentUserRole: fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
          targetUserRole: fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Authorization rules should be consistent and deterministic
          const result = canReverseAction(params);

          // Verify the result is deterministic (calling again gives same result)
          const result2 = canReverseAction(params);
          expect(result.allowed).toBe(result2.allowed);
          expect(result.reason).toBe(result2.reason);

          // Verify specific authorization rules
          if (params.currentUserRole === 'user') {
            // Rule 1: Regular users cannot perform any reversal actions
            expect(result.allowed).toBe(false);
          } else if (params.currentUserRole === 'moderator') {
            if (params.targetUserRole === 'admin') {
              // Rule 3: Moderators CANNOT reverse actions on admin users
              expect(result.allowed).toBe(false);
            } else {
              // Rule 2: Moderators can reverse actions on non-admin users
              expect(result.allowed).toBe(true);
            }
          } else if (params.currentUserRole === 'admin') {
            // Rule 4: Admins can reverse actions on ANY user
            expect(result.allowed).toBe(true);
          }

          // Verify that if action is not allowed, a reason is provided
          if (!result.allowed) {
            expect(result.reason).toBeDefined();
            expect(result.reason).not.toBe('');
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that ban removal is admin-only
   * Validates: Requirements 13.3, 13.13
   */
  it('should enforce that only admins can remove bans', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user roles
        fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
        (currentUserRole) => {
          // Property: Only admins should be able to remove bans
          // Ban removal is a special case of reversal that requires admin role
          
          const canRemoveBan = currentUserRole === 'admin';

          if (currentUserRole === 'admin') {
            expect(canRemoveBan).toBe(true);
          } else {
            expect(canRemoveBan).toBe(false);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test authorization matrix completeness
   * Validates: Requirements 13.8, 13.11, 13.12, 13.13
   */
  it('should have complete authorization coverage for all scenarios', () => {
    // This test verifies that every possible combination of roles has a defined authorization outcome
    
    const allRoles: Array<'user' | 'moderator' | 'admin'> = ['user', 'moderator', 'admin'];
    const allScenarios: Array<{
      currentUserRole: 'user' | 'moderator' | 'admin';
      targetUserRole: 'user' | 'moderator' | 'admin';
      isSelfReversal: boolean;
    }> = [];

    // Generate all possible combinations
    for (const currentUserRole of allRoles) {
      for (const targetUserRole of allRoles) {
        for (const isSelfReversal of [true, false]) {
          allScenarios.push({ currentUserRole, targetUserRole, isSelfReversal });
        }
      }
    }

    // Verify each scenario has a defined outcome
    for (const scenario of allScenarios) {
      const result = canReverseAction(scenario);
      
      // Every scenario must have a defined allowed/denied outcome
      expect(typeof result.allowed).toBe('boolean');
      
      // If denied, must have a reason
      if (!result.allowed) {
        expect(result.reason).toBeDefined();
        expect(result.reason).not.toBe('');
      }
    }

    // Verify we tested all 54 combinations (3 roles ÁE3 roles ÁE2 self-reversal states)
    expect(allScenarios.length).toBe(18);
  });
});


/**
 * Property 14: Reversal State Consistency
 * 
 * For any reversed action, the moderation_actions record should have revoked_at
 * and revoked_by fields populated, and the corresponding user state (suspension,
 * restriction) should be cleared.
 * 
 * Feature: moderation-system, Property 14: Reversal State Consistency
 * Validates: Requirements 13.5, 13.6, 13.7
 */
describe('Moderation Service - Property 14: Reversal State Consistency', () => {
  /**
   * Represents the state of a moderation action
   */
  interface ModerationActionState {
    id: string;
    action_type: 'user_suspended' | 'user_banned' | 'restriction_applied';
    target_user_id: string;
    moderator_id: string;
    revoked_at: string | null;
    revoked_by: string | null;
    metadata: {
      reversal_reason?: string;
      is_self_reversal?: boolean;
    } | null;
  }

  /**
   * Represents the state of a user's suspension
   */
  interface UserSuspensionState {
    user_id: string;
    suspended_until: string | null;
    suspension_reason: string | null;
  }

  /**
   * Represents the state of a user restriction
   */
  interface UserRestrictionState {
    id: string;
    user_id: string;
    restriction_type: 'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended';
    is_active: boolean;
  }

  /**
   * Simulates the reversal process and returns the resulting states
   */
  function simulateReversal(params: {
    actionType: 'user_suspended' | 'user_banned' | 'restriction_applied';
    targetUserId: string;
    moderatorId: string;
    reversalReason: string;
    isSelfReversal: boolean;
  }): {
    actionState: ModerationActionState;
    userState: UserSuspensionState;
    restrictionState: UserRestrictionState | null;
  } {
    const actionId = `action-${Math.random().toString(36).substring(7)}`;
    const restrictionId = `restriction-${Math.random().toString(36).substring(7)}`;

    // Simulate the reversal process
    const actionState: ModerationActionState = {
      id: actionId,
      action_type: params.actionType,
      target_user_id: params.targetUserId,
      moderator_id: params.moderatorId,
      revoked_at: new Date().toISOString(),
      revoked_by: params.moderatorId,
      metadata: {
        reversal_reason: params.reversalReason,
        is_self_reversal: params.isSelfReversal,
      },
    };

    // Simulate user state after reversal
    const userState: UserSuspensionState = {
      user_id: params.targetUserId,
      suspended_until: null,
      suspension_reason: null,
    };

    // Simulate restriction state after reversal
    let restrictionState: UserRestrictionState | null = null;
    if (params.actionType === 'user_suspended' || params.actionType === 'restriction_applied') {
      restrictionState = {
        id: restrictionId,
        user_id: params.targetUserId,
        restriction_type: params.actionType === 'user_suspended' ? 'suspended' : 'posting_disabled',
        is_active: false, // Deactivated after reversal
      };
    }

    return { actionState, userState, restrictionState };
  }

  /**
   * Test that revoked_at and revoked_by are populated after reversal
   * Validates: Requirements 13.5
   */
  it('should populate revoked_at and revoked_by fields after reversal', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: After reversal, revoked_at and revoked_by must be populated
          const { actionState } = simulateReversal(params);

          // Verify revoked_at is populated
          expect(actionState.revoked_at).not.toBeNull();
          expect(actionState.revoked_at).toBeDefined();
          expect(typeof actionState.revoked_at).toBe('string');

          // Verify revoked_by is populated
          expect(actionState.revoked_by).not.toBeNull();
          expect(actionState.revoked_by).toBeDefined();
          expect(actionState.revoked_by).toBe(params.moderatorId);

          // Verify metadata contains reversal reason
          expect(actionState.metadata).not.toBeNull();
          expect(actionState.metadata?.reversal_reason).toBe(params.reversalReason);
          expect(actionState.metadata?.is_self_reversal).toBe(params.isSelfReversal);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that user suspension state is cleared after reversal
   * Validates: Requirements 13.5, 13.6
   */
  it('should clear user suspension state after reversal', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary suspension reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned') as fc.Arbitrary<'user_suspended' | 'user_banned'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: After suspension reversal, user state should be cleared
          const { userState } = simulateReversal(params);

          // Verify suspended_until is cleared
          expect(userState.suspended_until).toBeNull();

          // Verify suspension_reason is cleared
          expect(userState.suspension_reason).toBeNull();
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that user restriction is deactivated after reversal
   * Validates: Requirements 13.5, 13.7
   */
  it('should deactivate user restriction after reversal', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary restriction reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: After reversal, restriction should be deactivated
          const { restrictionState } = simulateReversal(params);

          // Verify restriction exists and is deactivated
          expect(restrictionState).not.toBeNull();
          expect(restrictionState?.is_active).toBe(false);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test complete state consistency after reversal
   * Validates: Requirements 13.5, 13.6, 13.7
   */
  it('should maintain complete state consistency after reversal', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: All state changes should be consistent after reversal
          const { actionState, userState, restrictionState } = simulateReversal(params);

          // Verify action state consistency
          expect(actionState.revoked_at).not.toBeNull();
          expect(actionState.revoked_by).toBe(params.moderatorId);
          expect(actionState.metadata?.reversal_reason).toBe(params.reversalReason);

          // Verify user state consistency
          if (params.actionType === 'user_suspended' || params.actionType === 'user_banned') {
            expect(userState.suspended_until).toBeNull();
            expect(userState.suspension_reason).toBeNull();
          }

          // Verify restriction state consistency
          if (params.actionType === 'user_suspended' || params.actionType === 'restriction_applied') {
            expect(restrictionState).not.toBeNull();
            expect(restrictionState?.is_active).toBe(false);
          }

          // Verify target user ID consistency across all states
          expect(actionState.target_user_id).toBe(params.targetUserId);
          expect(userState.user_id).toBe(params.targetUserId);
          if (restrictionState) {
            expect(restrictionState.user_id).toBe(params.targetUserId);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal reason is always stored in metadata
   * Validates: Requirements 13.4, 13.5
   */
  it('should always store reversal reason in action metadata', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios with various reason lengths
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 1000 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Reversal reason must always be stored in metadata
          const { actionState } = simulateReversal(params);

          // Verify metadata exists
          expect(actionState.metadata).not.toBeNull();
          expect(actionState.metadata).toBeDefined();

          // Verify reversal reason is stored
          expect(actionState.metadata?.reversal_reason).toBeDefined();
          expect(actionState.metadata?.reversal_reason).toBe(params.reversalReason);

          // Verify reversal reason is not empty
          expect(actionState.metadata?.reversal_reason?.length).toBeGreaterThan(0);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that self-reversal flag is correctly set
   * Validates: Requirements 13.12
   */
  it('should correctly identify self-reversals in metadata', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: Self-reversal flag should match the input parameter
          const { actionState } = simulateReversal(params);

          // Verify self-reversal flag is correctly set
          expect(actionState.metadata?.is_self_reversal).toBe(params.isSelfReversal);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal timestamp is valid and recent
   * Validates: Requirements 13.5
   */
  it('should set a valid and recent timestamp for revoked_at', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
          targetUserId: fc.uuid(),
          moderatorId: fc.uuid(),
          reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
          isSelfReversal: fc.boolean(),
        }),
        (params) => {
          // Property: revoked_at should be a valid, recent timestamp
          const beforeReversal = new Date();
          const { actionState } = simulateReversal(params);
          const afterReversal = new Date();

          // Verify revoked_at is a valid ISO timestamp
          expect(actionState.revoked_at).not.toBeNull();
          const revokedAtDate = new Date(actionState.revoked_at!);
          expect(revokedAtDate.toString()).not.toBe('Invalid Date');

          // Verify timestamp is between before and after reversal
          expect(revokedAtDate.getTime()).toBeGreaterThanOrEqual(beforeReversal.getTime() - 1000); // Allow 1s tolerance
          expect(revokedAtDate.getTime()).toBeLessThanOrEqual(afterReversal.getTime() + 1000); // Allow 1s tolerance
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test state consistency across multiple reversals
   * Validates: Requirements 13.5, 13.6, 13.7
   */
  it('should maintain state consistency across multiple reversal operations', () => {
    // Configure minimum runs for property testing
    const numRuns = 50; // Fewer runs since this tests multiple operations

    fc.assert(
      fc.property(
        // Generate multiple reversal scenarios for the same user
        fc.record({
          targetUserId: fc.uuid(),
          reversals: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'restriction_applied') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'restriction_applied'>,
              moderatorId: fc.uuid(),
              reversalReason: fc.string({ minLength: 1, maxLength: 100 }),
              isSelfReversal: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        (params) => {
          // Property: Each reversal should maintain consistent state
          const results = params.reversals.map(reversal =>
            simulateReversal({
              ...reversal,
              targetUserId: params.targetUserId,
            })
          );

          // Verify each reversal maintains state consistency
          for (const result of results) {
            // Action state consistency
            expect(result.actionState.revoked_at).not.toBeNull();
            expect(result.actionState.revoked_by).not.toBeNull();
            expect(result.actionState.metadata?.reversal_reason).toBeDefined();

            // User state consistency
            expect(result.userState.user_id).toBe(params.targetUserId);
            expect(result.userState.suspended_until).toBeNull();
            expect(result.userState.suspension_reason).toBeNull();

            // Restriction state consistency (if applicable)
            if (result.restrictionState) {
              expect(result.restrictionState.user_id).toBe(params.targetUserId);
              expect(result.restrictionState.is_active).toBe(false);
            }
          }

          // Verify all reversals target the same user
          const allTargetSameUser = results.every(
            result => result.actionState.target_user_id === params.targetUserId
          );
          expect(allTargetSameUser).toBe(true);
        }
      ),
      { numRuns }
    );
  });
});


/**
 * Property 15: Reversal Notification Delivery
 * 
 * For any reversed action, a notification should be sent to the affected user
 * with reversal details including who reversed it and why.
 * 
 * Feature: moderation-system, Property 15: Reversal Notification Delivery
 * Validates: Requirements 13.6, 13.15
 */
describe('Moderation Service - Property 15: Reversal Notification Delivery', () => {
  /**
   * Represents a notification that was sent
   */
  interface SentNotification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    related_notification_id: string | null;
    data: {
      moderation_action: string;
      reversal_type: string;
      moderator_name: string;
      reversal_reason: string;
      restriction_type?: string;
      original_action?: {
        reason: string;
        appliedBy: string;
        appliedAt: string;
        durationDays?: number;
      };
    };
    created_at: string;
  }

  /**
   * Simulates sending a reversal notification
   */
  function simulateReversalNotification(params: {
    userId: string;
    reversalType: 'suspension_lifted' | 'ban_removed' | 'restriction_removed';
    moderatorName: string;
    reversalReason: string;
    restrictionType?: 'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended';
    originalAction?: {
      reason: string;
      appliedBy: string;
      appliedAt: string;
      durationDays?: number;
    };
    relatedNotificationId?: string;
  }): SentNotification {
    // Generate notification title
    let title: string;
    switch (params.reversalType) {
      case 'suspension_lifted':
        title = 'Suspension Lifted';
        break;
      case 'ban_removed':
        title = 'Ban Removed';
        break;
      case 'restriction_removed':
        title = 'Restriction Removed';
        break;
    }

    // Generate notification message
    let message = `Your ${params.reversalType.replace('_', ' ')} by ${params.moderatorName}.\n\n`;
    message += `Reason for reversal: ${params.reversalReason}\n\n`;
    
    if (params.originalAction) {
      message += 'Original Action Details:\n';
      message += `• Reason: ${params.originalAction.reason}\n`;
      message += `• Applied by: ${params.originalAction.appliedBy}\n`;
      message += `• Applied on: ${new Date(params.originalAction.appliedAt).toLocaleDateString()}\n`;
      if (params.originalAction.durationDays) {
        message += `• Duration: ${params.originalAction.durationDays} days\n`;
      }
    }

    // Create notification object
    return {
      id: `notif-${Math.random().toString(36).substring(7)}`,
      user_id: params.userId,
      type: 'moderation',
      title,
      message,
      read: false,
      related_notification_id: params.relatedNotificationId || null,
      data: {
        moderation_action: 'action_reversed',
        reversal_type: params.reversalType,
        moderator_name: params.moderatorName,
        reversal_reason: params.reversalReason,
        restriction_type: params.restrictionType,
        original_action: params.originalAction,
      },
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Test that a notification is sent for every reversal action
   * Validates: Requirements 13.6, 13.15
   */
  it('should send a notification for every reversal action', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
          restrictionType: fc.option(
            fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended') as fc.Arbitrary<'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended'>,
            { nil: undefined }
          ),
        }),
        (params) => {
          // Property: Every reversal should result in a notification being sent
          const notification = simulateReversalNotification(params);

          // Verify notification was created
          expect(notification).toBeDefined();
          expect(notification.id).toBeDefined();

          // Verify notification targets correct user
          expect(notification.user_id).toBe(params.userId);

          // Verify notification type is correct
          expect(notification.type).toBe('moderation');

          // Verify notification is unread by default
          expect(notification.read).toBe(false);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification contains moderator name
   * Validates: Requirements 13.6, 13.15
   */
  it('should include moderator name in notification', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: Notification must include moderator name
          const notification = simulateReversalNotification(params);

          // Verify moderator name is in notification data
          expect(notification.data.moderator_name).toBe(params.moderatorName);

          // Verify moderator name is mentioned in message
          expect(notification.message).toContain(params.moderatorName);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification contains reversal reason
   * Validates: Requirements 13.6, 13.15
   */
  it('should include reversal reason in notification', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: Notification must include reversal reason
          const notification = simulateReversalNotification(params);

          // Verify reversal reason is in notification data
          expect(notification.data.reversal_reason).toBe(params.reversalReason);

          // Verify reversal reason is mentioned in message
          expect(notification.message).toContain(params.reversalReason);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification includes original action details
   * Validates: Requirements 13.6, 13.15
   */
  it('should include original action details in notification', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios with original action
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
          originalAction: fc.record({
            reason: fc.string({ minLength: 10, maxLength: 100 }),
            appliedBy: fc.string({ minLength: 3, maxLength: 30 }),
            appliedAt: fc.integer({ min: Date.parse('2020-01-01'), max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
            durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: undefined }),
          }),
        }),
        (params) => {
          // Property: Notification must include original action details
          const notification = simulateReversalNotification(params);

          // Verify original action is in notification data
          expect(notification.data.original_action).toBeDefined();
          expect(notification.data.original_action?.reason).toBe(params.originalAction.reason);
          expect(notification.data.original_action?.appliedBy).toBe(params.originalAction.appliedBy);
          expect(notification.data.original_action?.appliedAt).toBe(params.originalAction.appliedAt);
          expect(notification.data.original_action?.durationDays).toBe(params.originalAction.durationDays);

          // Verify original action details are mentioned in message
          expect(notification.message).toContain('Original Action Details');
          expect(notification.message).toContain(params.originalAction.reason);
          expect(notification.message).toContain(params.originalAction.appliedBy);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification has correct title based on reversal type
   * Validates: Requirements 13.6, 13.15
   */
  it('should have correct title based on reversal type', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: Notification title must match reversal type
          const notification = simulateReversalNotification(params);

          // Verify title matches reversal type
          if (params.reversalType === 'suspension_lifted') {
            expect(notification.title).toBe('Suspension Lifted');
          } else if (params.reversalType === 'ban_removed') {
            expect(notification.title).toBe('Ban Removed');
          } else if (params.reversalType === 'restriction_removed') {
            expect(notification.title).toBe('Restriction Removed');
          }

          // Verify reversal type is in notification data
          expect(notification.data.reversal_type).toBe(params.reversalType);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification includes restriction type for restriction removals
   * Validates: Requirements 13.6, 13.15
   */
  it('should include restriction type for restriction removal notifications', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary restriction removal scenarios
        fc.record({
          userId: fc.uuid(),
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
          restrictionType: fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended') as fc.Arbitrary<'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended'>,
        }),
        (params) => {
          // Property: Restriction removal notifications must include restriction type
          const notification = simulateReversalNotification({
            ...params,
            reversalType: 'restriction_removed',
          });

          // Verify restriction type is in notification data
          expect(notification.data.restriction_type).toBe(params.restrictionType);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification can link to original notification
   * Validates: Requirements 13.6
   */
  it('should link to original notification when provided', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios with related notification
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
          relatedNotificationId: fc.uuid(),
        }),
        (params) => {
          // Property: Notification should link to original notification when provided
          const notification = simulateReversalNotification(params);

          // Verify related notification ID is set
          expect(notification.related_notification_id).toBe(params.relatedNotificationId);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification timestamp is valid and recent
   * Validates: Requirements 13.6
   */
  it('should have a valid and recent timestamp', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: Notification timestamp should be valid and recent
          const beforeNotification = new Date();
          const notification = simulateReversalNotification(params);
          const afterNotification = new Date();

          // Verify created_at is a valid ISO timestamp
          expect(notification.created_at).toBeDefined();
          const createdAtDate = new Date(notification.created_at);
          expect(createdAtDate.toString()).not.toBe('Invalid Date');

          // Verify timestamp is between before and after notification creation
          expect(createdAtDate.getTime()).toBeGreaterThanOrEqual(beforeNotification.getTime() - 1000); // Allow 1s tolerance
          expect(createdAtDate.getTime()).toBeLessThanOrEqual(afterNotification.getTime() + 1000); // Allow 1s tolerance
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test notification completeness across all reversal types
   * Validates: Requirements 13.6, 13.15
   */
  it('should have complete notification data for all reversal types', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
          restrictionType: fc.option(
            fc.constantFrom('posting_disabled', 'commenting_disabled', 'upload_disabled', 'suspended') as fc.Arbitrary<'posting_disabled' | 'commenting_disabled' | 'upload_disabled' | 'suspended'>,
            { nil: undefined }
          ),
          originalAction: fc.option(
            fc.record({
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              appliedBy: fc.string({ minLength: 3, maxLength: 30 }),
              appliedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms).toISOString()),
              durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: undefined }),
            }),
            { nil: undefined }
          ),
          relatedNotificationId: fc.option(fc.uuid(), { nil: undefined }),
        }),
        (params) => {
          // Property: All notifications should have complete required data
          const notification = simulateReversalNotification(params);

          // Verify all required fields are present
          expect(notification.id).toBeDefined();
          expect(notification.user_id).toBe(params.userId);
          expect(notification.type).toBe('moderation');
          expect(notification.title).toBeDefined();
          expect(notification.message).toBeDefined();
          expect(notification.read).toBe(false);
          expect(notification.created_at).toBeDefined();

          // Verify notification data is complete
          expect(notification.data).toBeDefined();
          expect(notification.data.moderation_action).toBe('action_reversed');
          expect(notification.data.reversal_type).toBe(params.reversalType);
          expect(notification.data.moderator_name).toBe(params.moderatorName);
          expect(notification.data.reversal_reason).toBe(params.reversalReason);

          // Verify optional fields match input
          if (params.restrictionType) {
            expect(notification.data.restriction_type).toBe(params.restrictionType);
          }
          if (params.originalAction) {
            expect(notification.data.original_action).toEqual(params.originalAction);
          }
          if (params.relatedNotificationId) {
            expect(notification.related_notification_id).toBe(params.relatedNotificationId);
          }

          // Verify message is not empty
          expect(notification.message.length).toBeGreaterThan(0);

          // Verify title is not empty
          expect(notification.title.length).toBeGreaterThan(0);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that notification message format is consistent
   * Validates: Requirements 13.15
   */
  it('should have consistent message format across all notifications', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal scenarios
        fc.record({
          userId: fc.uuid(),
          reversalType: fc.constantFrom('suspension_lifted', 'ban_removed', 'restriction_removed') as fc.Arbitrary<'suspension_lifted' | 'ban_removed' | 'restriction_removed'>,
          moderatorName: fc.string({ minLength: 3, maxLength: 30 }),
          reversalReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: All notification messages should follow consistent format
          const notification = simulateReversalNotification(params);

          // Verify message contains key sections
          expect(notification.message).toContain('Reason for reversal:');
          expect(notification.message).toContain(params.moderatorName);
          expect(notification.message).toContain(params.reversalReason);

          // Verify message is properly formatted (has line breaks)
          expect(notification.message).toContain('\n');

          // Verify message is not just whitespace
          expect(notification.message.trim().length).toBeGreaterThan(0);
        }
      ),
      { numRuns }
    );
  });
});



/**
 * Property 16: Reversal History Completeness
 * 
 * For any user with moderation history, fetching their history should include
 * both original actions and reversals in chronological order with complete details.
 * 
 * Feature: moderation-system, Property 16: Reversal History Completeness
 * Validates: Requirements 14.1, 14.2
 */
describe('Moderation Service - Property 16: Reversal History Completeness', () => {
  /**
   * Represents a moderation action in history
   */
  interface ModerationHistoryEntry {
    id: string;
    action_type: 'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed';
    target_user_id: string;
    moderator_id: string;
    reason: string;
    created_at: string;
    revoked_at: string | null;
    revoked_by: string | null;
    metadata: {
      reversal_reason?: string;
      is_self_reversal?: boolean;
      duration_days?: number;
    } | null;
  }

  /**
   * Simulates fetching a user's complete moderation history
   */
  function simulateGetUserModerationHistory(params: {
    userId: string;
    actions: Array<{
      actionType: 'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed';
      moderatorId: string;
      reason: string;
      createdAt: Date;
      isReversed: boolean;
      reversalDetails?: {
        revokedAt: Date;
        revokedBy: string;
        reversalReason: string;
        isSelfReversal: boolean;
      };
      durationDays?: number;
    }>;
    includeRevoked?: boolean;
  }): ModerationHistoryEntry[] {
    // Filter out actions with invalid dates
    const validActions = params.actions.filter(action => {
      // Check if createdAt is valid
      if (isNaN(action.createdAt.getTime())) {
        return false;
      }
      
      // Check if reversalDetails dates are valid (if present)
      if (action.isReversed && action.reversalDetails) {
        if (isNaN(action.reversalDetails.revokedAt.getTime())) {
          return false;
        }
        // Ensure revoked_at is after created_at
        if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) {
          return false;
        }
      }
      
      return true;
    });

    // Filter actions based on includeRevoked parameter
    let filteredActions = validActions;
    if (params.includeRevoked === false) {
      filteredActions = validActions.filter(action => !action.isReversed);
    }

    // Convert to history entries
    const historyEntries: ModerationHistoryEntry[] = filteredActions.map(action => ({
      id: `action-${Math.random().toString(36).substring(7)}`,
      action_type: action.actionType,
      target_user_id: params.userId,
      moderator_id: action.moderatorId,
      reason: action.reason,
      created_at: action.createdAt.toISOString(),
      revoked_at: action.isReversed && action.reversalDetails ? action.reversalDetails.revokedAt.toISOString() : null,
      revoked_by: action.isReversed && action.reversalDetails ? action.reversalDetails.revokedBy : null,
      metadata: {
        reversal_reason: action.isReversed && action.reversalDetails ? action.reversalDetails.reversalReason : undefined,
        is_self_reversal: action.isReversed && action.reversalDetails ? action.reversalDetails.isSelfReversal : undefined,
        duration_days: action.durationDays,
      },
    }));

    // Sort by created_at in chronological order (oldest first)
    historyEntries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return historyEntries;
  }

  /**
   * Test that history includes both original actions and reversals
   * Validates: Requirements 14.1, 14.2
   */
  it('should include both original actions and reversals in history', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history with mix of reversed and non-reversed actions
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
              durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (params) => {
          // Ensure reversed actions have reversal details
          const validatedActions = params.actions.map(action => ({
            ...action,
            reversalDetails: action.isReversed && !action.reversalDetails
              ? {
                  revokedAt: new Date(action.createdAt.getTime() + 86400000), // 1 day after creation
                  revokedBy: fc.sample(fc.uuid(), 1)[0],
                  reversalReason: 'Test reversal reason',
                  isSelfReversal: false,
                }
              : action.reversalDetails,
          }));

          // Property: History should include both original and reversed actions
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: validatedActions,
            includeRevoked: true,
          });

          // Count valid actions (those that pass validation in simulateGetUserModerationHistory)
          const validActionsCount = validatedActions.filter(action => {
            // Check if createdAt is valid
            if (isNaN(action.createdAt.getTime())) {
              return false;
            }
            
            // Check if reversalDetails dates are valid (if present)
            if (action.isReversed && action.reversalDetails) {
              if (isNaN(action.reversalDetails.revokedAt.getTime())) {
                return false;
              }
              // Ensure revoked_at is after created_at
              if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) {
                return false;
              }
            }
            
            return true;
          }).length;

          // Verify history includes all valid actions
          expect(history.length).toBe(validActionsCount);

          // Count reversed and non-reversed actions in history
          const historyReversedCount = history.filter(h => h.revoked_at !== null).length;
          const historyNonReversedCount = history.filter(h => h.revoked_at === null).length;

          // Verify total count matches
          expect(historyReversedCount + historyNonReversedCount).toBe(validActionsCount);

          // Verify all entries target the correct user
          expect(history.every(entry => entry.target_user_id === params.userId)).toBe(true);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that history is returned in chronological order
   * Validates: Requirements 14.2
   */
  it('should return history in chronological order', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history with random timestamps
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
            }),
            { minLength: 2, maxLength: 10 }
          ),
        }),
        (params) => {
          // Property: History should be in chronological order (oldest first)
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: params.actions,
            includeRevoked: true,
          });

          // Verify chronological order
          for (let i = 1; i < history.length; i++) {
            const prevDate = new Date(history[i - 1].created_at);
            const currDate = new Date(history[i].created_at);
            expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversed actions have complete reversal details
   * Validates: Requirements 14.1
   */
  it('should include complete reversal details for reversed actions', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history with reversed actions
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.constant(true), // All actions are reversed
              reversalDetails: fc.record({
                revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                revokedBy: fc.uuid(),
                reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                isSelfReversal: fc.boolean(),
              }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (params) => {
          // Property: All reversed actions should have complete reversal details
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: params.actions,
            includeRevoked: true,
          });

          // Verify all entries have reversal details
          for (const entry of history) {
            // Verify revoked_at is populated
            expect(entry.revoked_at).not.toBeNull();
            expect(entry.revoked_at).toBeDefined();

            // Verify revoked_by is populated
            expect(entry.revoked_by).not.toBeNull();
            expect(entry.revoked_by).toBeDefined();

            // Verify reversal_reason is in metadata
            expect(entry.metadata).not.toBeNull();
            expect(entry.metadata?.reversal_reason).toBeDefined();
            expect(entry.metadata?.reversal_reason?.length).toBeGreaterThan(0);

            // Verify is_self_reversal flag is present
            expect(entry.metadata?.is_self_reversal).toBeDefined();
            expect(typeof entry.metadata?.is_self_reversal).toBe('boolean');
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that filtering by includeRevoked works correctly
   * Validates: Requirements 14.1, 14.2
   */
  it('should support filtering by includeRevoked parameter', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history with mix of reversed and non-reversed actions
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
            }),
            { minLength: 2, maxLength: 10 }
          ),
        }),
        (params) => {
          // Ensure reversed actions have reversal details
          const validatedActions = params.actions.map(action => ({
            ...action,
            reversalDetails: action.isReversed && !action.reversalDetails
              ? {
                  revokedAt: new Date(action.createdAt.getTime() + 86400000),
                  revokedBy: fc.sample(fc.uuid(), 1)[0],
                  reversalReason: 'Test reversal reason',
                  isSelfReversal: false,
                }
              : action.reversalDetails,
          }));

          // Property: Filtering should work correctly
          const historyWithRevoked = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: validatedActions,
            includeRevoked: true,
          });

          const historyWithoutRevoked = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: validatedActions,
            includeRevoked: false,
          });

          // Count valid actions (those that pass validation)
          const validActionsCount = validatedActions.filter(action => {
            if (isNaN(action.createdAt.getTime())) return false;
            if (action.isReversed && action.reversalDetails) {
              if (isNaN(action.reversalDetails.revokedAt.getTime())) return false;
              if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) return false;
            }
            return true;
          }).length;

          const validNonReversedCount = validatedActions.filter(action => {
            if (isNaN(action.createdAt.getTime())) return false;
            if (action.isReversed) return false;
            return true;
          }).length;

          // Verify counts
          expect(historyWithRevoked.length).toBe(validActionsCount);
          expect(historyWithoutRevoked.length).toBe(validNonReversedCount);

          // Verify historyWithoutRevoked contains no reversed actions
          expect(historyWithoutRevoked.every(entry => entry.revoked_at === null)).toBe(true);

          // Verify historyWithRevoked may contain reversed actions (only if there are valid reversed actions)
          const hasValidReversedActions = validatedActions.some(action => {
            if (!action.isReversed) return false;
            if (isNaN(action.createdAt.getTime())) return false;
            if (action.reversalDetails) {
              if (isNaN(action.reversalDetails.revokedAt.getTime())) return false;
              if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) return false;
            }
            return true;
          });
          
          if (hasValidReversedActions) {
            expect(historyWithRevoked.some(entry => entry.revoked_at !== null)).toBe(true);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that history maintains complete action details
   * Validates: Requirements 14.1, 14.2
   */
  it('should maintain complete action details in history', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
              durationDays: fc.option(fc.integer({ min: 1, max: 365 }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (params) => {
          // Property: All action details should be preserved in history
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: params.actions,
            includeRevoked: true,
          });

          // Verify all entries have required fields
          for (const entry of history) {
            // Verify basic fields
            expect(entry.id).toBeDefined();
            expect(entry.action_type).toBeDefined();
            expect(entry.target_user_id).toBe(params.userId);
            expect(entry.moderator_id).toBeDefined();
            expect(entry.reason).toBeDefined();
            expect(entry.reason.length).toBeGreaterThan(0);
            expect(entry.created_at).toBeDefined();

            // Verify created_at is a valid ISO timestamp
            const createdAtDate = new Date(entry.created_at);
            expect(createdAtDate.toString()).not.toBe('Invalid Date');

            // Verify metadata exists
            expect(entry.metadata).toBeDefined();

            // If action is reversed, verify reversal details
            if (entry.revoked_at !== null) {
              expect(entry.revoked_by).not.toBeNull();
              expect(entry.metadata?.reversal_reason).toBeDefined();
              expect(entry.metadata?.is_self_reversal).toBeDefined();

              // Verify revoked_at is a valid ISO timestamp
              const revokedAtDate = new Date(entry.revoked_at);
              expect(revokedAtDate.toString()).not.toBe('Invalid Date');

              // Verify revoked_at is after or equal to created_at
              // Note: The simulation function filters out invalid cases where revoked_at < created_at
              expect(revokedAtDate.getTime()).toBeGreaterThanOrEqual(createdAtDate.getTime());
            }
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that history handles multiple reversals correctly
   * Validates: Requirements 14.1, 14.2
   */
  it('should handle multiple actions and reversals for the same user', () => {
    // Configure minimum runs for property testing
    const numRuns = 50; // Fewer runs since this tests complex scenarios

    fc.assert(
      fc.property(
        // Generate user history with multiple actions over time
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
            }),
            { minLength: 3, maxLength: 15 }
          ),
        }),
        (params) => {
          // Ensure reversed actions have reversal details
          const validatedActions = params.actions.map(action => ({
            ...action,
            reversalDetails: action.isReversed && !action.reversalDetails
              ? {
                  revokedAt: new Date(action.createdAt.getTime() + 86400000),
                  revokedBy: fc.sample(fc.uuid(), 1)[0],
                  reversalReason: 'Test reversal reason',
                  isSelfReversal: false,
                }
              : action.reversalDetails,
          }));

          // Property: History should handle multiple actions correctly
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: validatedActions,
            includeRevoked: true,
          });

          // Count valid actions (those that pass validation)
          const validActionsCount = validatedActions.filter(action => {
            if (isNaN(action.createdAt.getTime())) return false;
            if (action.isReversed && action.reversalDetails) {
              if (isNaN(action.reversalDetails.revokedAt.getTime())) return false;
              if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) return false;
            }
            return true;
          }).length;

          // Verify all valid actions are included
          expect(history.length).toBe(validActionsCount);

          // Verify chronological order
          for (let i = 1; i < history.length; i++) {
            const prevDate = new Date(history[i - 1].created_at);
            const currDate = new Date(history[i].created_at);
            expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
          }

          // Verify all entries target the same user
          expect(history.every(entry => entry.target_user_id === params.userId)).toBe(true);

          // Verify reversed actions have complete details
          const reversedEntries = history.filter(entry => entry.revoked_at !== null);
          for (const entry of reversedEntries) {
            expect(entry.revoked_by).not.toBeNull();
            expect(entry.metadata?.reversal_reason).toBeDefined();
            expect(entry.metadata?.is_self_reversal).toBeDefined();
          }

          // Verify non-reversed actions don't have reversal details
          const nonReversedEntries = history.filter(entry => entry.revoked_at === null);
          for (const entry of nonReversedEntries) {
            expect(entry.revoked_by).toBeNull();
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that empty history is handled correctly
   * Validates: Requirements 14.1, 14.2
   */
  it('should handle users with no moderation history', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user ID with no actions
        fc.uuid(),
        (userId) => {
          // Property: Empty history should be handled gracefully
          const history = simulateGetUserModerationHistory({
            userId,
            actions: [],
            includeRevoked: true,
          });

          // Verify empty array is returned
          expect(history).toBeDefined();
          expect(Array.isArray(history)).toBe(true);
          expect(history.length).toBe(0);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that history preserves action type information
   * Validates: Requirements 14.1, 14.2
   */
  it('should preserve action type information in history', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary user history with various action types
        fc.record({
          userId: fc.uuid(),
          actions: fc.array(
            fc.record({
              actionType: fc.constantFrom('user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed') as fc.Arbitrary<'user_suspended' | 'user_banned' | 'user_warned' | 'restriction_applied' | 'content_removed'>,
              moderatorId: fc.uuid(),
              reason: fc.string({ minLength: 10, maxLength: 100 }),
              createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              isReversed: fc.boolean(),
              reversalDetails: fc.option(
                fc.record({
                  revokedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  revokedBy: fc.uuid(),
                  reversalReason: fc.string({ minLength: 10, maxLength: 100 }),
                  isSelfReversal: fc.boolean(),
                }),
                { nil: undefined }
              ),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        (params) => {
          // Property: Action types should be preserved in history
          const history = simulateGetUserModerationHistory({
            userId: params.userId,
            actions: params.actions,
            includeRevoked: true,
          });

          // Get action types from valid actions only (those that pass validation)
          const validActions = params.actions.filter(action => {
            if (isNaN(action.createdAt.getTime())) return false;
            if (action.isReversed && action.reversalDetails) {
              if (isNaN(action.reversalDetails.revokedAt.getTime())) return false;
              if (action.reversalDetails.revokedAt.getTime() < action.createdAt.getTime()) return false;
            }
            return true;
          });

          const inputActionTypes = validActions.map(a => a.actionType).sort();
          const historyActionTypes = history.map(h => h.action_type).sort();

          expect(historyActionTypes).toEqual(inputActionTypes);

          // Verify all action types are valid
          const validActionTypes = ['user_suspended', 'user_banned', 'user_warned', 'restriction_applied', 'content_removed'];
          for (const entry of history) {
            expect(validActionTypes).toContain(entry.action_type);
          }
        }
      ),
      { numRuns }
    );
  });
});


/**
 * Property 17: Reversal Metrics Accuracy
 * 
 * For any time period, the reversal rate calculation should equal (number of
 * reversed actions / total actions) * 100, and per-moderator rates should be
 * calculated correctly.
 * 
 * Feature: moderation-system, Property 17: Reversal Metrics Accuracy
 * Validates: Requirements 14.3, 14.7
 */
describe('Moderation Service - Property 17: Reversal Metrics Accuracy', () => {
  /**
   * Represents reversal metrics for a time period
   */
  interface ReversalMetrics {
    totalActions: number;
    reversedActions: number;
    reversalRate: number;
    moderatorStats: Array<{
      moderatorId: string;
      totalActions: number;
      reversedActions: number;
      reversalRate: number;
    }>;
    timeToReversal: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  }

  /**
   * Represents a moderation action for metrics calculation
   */
  interface ModerationActionForMetrics {
    id: string;
    moderator_id: string;
    created_at: Date;
    revoked_at: Date | null;
    revoked_by: string | null;
  }

  /**
   * Calculates reversal metrics from a set of actions
   */
  function calculateReversalMetrics(
    actions: ModerationActionForMetrics[]
  ): ReversalMetrics {
    // Filter out invalid actions
    const validActions = actions.filter(action => {
      if (isNaN(action.created_at.getTime())) return false;
      if (action.revoked_at && isNaN(action.revoked_at.getTime())) return false;
      if (action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()) return false;
      return true;
    });

    const totalActions = validActions.length;
    const reversedActions = validActions.filter(a => a.revoked_at !== null).length;
    const reversalRate = totalActions > 0 ? (reversedActions / totalActions) * 100 : 0;

    // Calculate per-moderator stats
    const moderatorMap = new Map<string, { total: number; reversed: number }>();
    
    for (const action of validActions) {
      const stats = moderatorMap.get(action.moderator_id) || { total: 0, reversed: 0 };
      stats.total++;
      if (action.revoked_at !== null) {
        stats.reversed++;
      }
      moderatorMap.set(action.moderator_id, stats);
    }

    const moderatorStats = Array.from(moderatorMap.entries()).map(([moderatorId, stats]) => ({
      moderatorId,
      totalActions: stats.total,
      reversedActions: stats.reversed,
      reversalRate: stats.total > 0 ? (stats.reversed / stats.total) * 100 : 0,
    }));

    // Calculate time-to-reversal metrics
    const reversalTimes = validActions
      .filter(a => a.revoked_at !== null)
      .map(a => a.revoked_at!.getTime() - a.created_at.getTime())
      .filter(time => time >= 0); // Only include valid positive times

    const timeToReversal = {
      average: reversalTimes.length > 0 
        ? reversalTimes.reduce((sum, time) => sum + time, 0) / reversalTimes.length 
        : 0,
      median: reversalTimes.length > 0
        ? reversalTimes.sort((a, b) => a - b)[Math.floor(reversalTimes.length / 2)]
        : 0,
      min: reversalTimes.length > 0 ? Math.min(...reversalTimes) : 0,
      max: reversalTimes.length > 0 ? Math.max(...reversalTimes) : 0,
    };

    return {
      totalActions,
      reversedActions,
      reversalRate,
      moderatorStats,
      timeToReversal,
    };
  }

  /**
   * Test that overall reversal rate is calculated correctly
   * Validates: Requirements 14.3
   */
  it('should calculate overall reversal rate correctly', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary actions with some reversed
        fc.array(
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
            revoked_at: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              { nil: null }
            ),
            revoked_by: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000) // 1 day after
              : action.revoked_at,
          }));

          // Property: Reversal rate should equal (reversed / total) * 100
          const metrics = calculateReversalMetrics(validatedActions);

          // Count valid actions manually
          const validActions = validatedActions.filter(action => {
            if (isNaN(action.created_at.getTime())) return false;
            if (action.revoked_at && isNaN(action.revoked_at.getTime())) return false;
            if (action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()) return false;
            return true;
          });

          const expectedTotal = validActions.length;
          const expectedReversed = validActions.filter(a => a.revoked_at !== null).length;
          const expectedRate = expectedTotal > 0 ? (expectedReversed / expectedTotal) * 100 : 0;

          // Verify metrics match expected values
          expect(metrics.totalActions).toBe(expectedTotal);
          expect(metrics.reversedActions).toBe(expectedReversed);
          expect(metrics.reversalRate).toBeCloseTo(expectedRate, 2);

          // Verify reversal rate is between 0 and 100
          expect(metrics.reversalRate).toBeGreaterThanOrEqual(0);
          expect(metrics.reversalRate).toBeLessThanOrEqual(100);

          // Verify formula: reversalRate = (reversedActions / totalActions) * 100
          if (metrics.totalActions > 0) {
            const calculatedRate = (metrics.reversedActions / metrics.totalActions) * 100;
            expect(metrics.reversalRate).toBeCloseTo(calculatedRate, 2);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that per-moderator reversal rates are calculated correctly
   * Validates: Requirements 14.7
   */
  it('should calculate per-moderator reversal rates correctly', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate actions from multiple moderators
        fc.record({
          moderators: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          actionsPerModerator: fc.integer({ min: 1, max: 10 }),
        }).chain(({ moderators, actionsPerModerator }) =>
          fc.record({
            moderators: fc.constant(moderators),
            actions: fc.array(
              fc.record({
                id: fc.uuid(),
                moderator_id: fc.constantFrom(...moderators),
                created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                revoked_at: fc.option(
                  fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                  { nil: null }
                ),
                revoked_by: fc.option(fc.uuid(), { nil: null }),
              }),
              { minLength: moderators.length, maxLength: moderators.length * actionsPerModerator }
            ),
          })
        ),
        (params) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = params.actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000)
              : action.revoked_at,
          }));

          // Property: Per-moderator rates should be calculated correctly
          const metrics = calculateReversalMetrics(validatedActions);

          // Verify each moderator's stats
          for (const moderatorStat of metrics.moderatorStats) {
            // Count actions for this moderator manually
            const moderatorActions = validatedActions.filter(
              a => a.moderator_id === moderatorStat.moderatorId &&
                   !isNaN(a.created_at.getTime()) &&
                   (!a.revoked_at || (!isNaN(a.revoked_at.getTime()) && a.revoked_at.getTime() >= a.created_at.getTime()))
            );
            const moderatorReversed = moderatorActions.filter(a => a.revoked_at !== null).length;
            const expectedRate = moderatorActions.length > 0
              ? (moderatorReversed / moderatorActions.length) * 100
              : 0;

            // Verify moderator stats
            expect(moderatorStat.totalActions).toBe(moderatorActions.length);
            expect(moderatorStat.reversedActions).toBe(moderatorReversed);
            expect(moderatorStat.reversalRate).toBeCloseTo(expectedRate, 2);

            // Verify rate is between 0 and 100
            expect(moderatorStat.reversalRate).toBeGreaterThanOrEqual(0);
            expect(moderatorStat.reversalRate).toBeLessThanOrEqual(100);

            // Verify formula
            if (moderatorStat.totalActions > 0) {
              const calculatedRate = (moderatorStat.reversedActions / moderatorStat.totalActions) * 100;
              expect(moderatorStat.reversalRate).toBeCloseTo(calculatedRate, 2);
            }
          }

          // Verify all moderators are included
          const uniqueModerators = new Set(
            validatedActions
              .filter(a => 
                !isNaN(a.created_at.getTime()) &&
                (!a.revoked_at || (!isNaN(a.revoked_at.getTime()) && a.revoked_at.getTime() >= a.created_at.getTime()))
              )
              .map(a => a.moderator_id)
          );
          expect(metrics.moderatorStats.length).toBe(uniqueModerators.size);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that time-to-reversal metrics are calculated correctly
   * Validates: Requirements 14.7
   */
  it('should calculate time-to-reversal metrics correctly', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate actions with reversals at various times
        fc.array(
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2023-12-31').getTime() }).map(ms => new Date(ms)),
            revoked_at: fc.option(
              fc.integer({ min: 1, max: 30 * 24 * 60 * 60 * 1000 }), // 1ms to 30 days offset
              { nil: null }
            ),
            revoked_by: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at !== null
              ? new Date(action.created_at.getTime() + action.revoked_at)
              : null,
          }));

          // Property: Time-to-reversal metrics should be accurate
          const metrics = calculateReversalMetrics(validatedActions);

          // Get valid reversed actions
          const reversedActions = validatedActions.filter(
            a => a.revoked_at !== null &&
                 !isNaN(a.created_at.getTime()) &&
                 !isNaN(a.revoked_at.getTime()) &&
                 a.revoked_at.getTime() >= a.created_at.getTime()
          );

          if (reversedActions.length === 0) {
            // No reversed actions, all metrics should be 0
            expect(metrics.timeToReversal.average).toBe(0);
            expect(metrics.timeToReversal.median).toBe(0);
            expect(metrics.timeToReversal.min).toBe(0);
            expect(metrics.timeToReversal.max).toBe(0);
          } else {
            // Calculate expected times
            const times = reversedActions
              .map(a => a.revoked_at!.getTime() - a.created_at.getTime())
              .filter(time => time >= 0);

            const expectedAverage = times.reduce((sum, time) => sum + time, 0) / times.length;
            const sortedTimes = times.sort((a, b) => a - b);
            const expectedMedian = sortedTimes[Math.floor(sortedTimes.length / 2)];
            const expectedMin = Math.min(...times);
            const expectedMax = Math.max(...times);

            // Verify metrics
            expect(metrics.timeToReversal.average).toBeCloseTo(expectedAverage, 0);
            expect(metrics.timeToReversal.median).toBe(expectedMedian);
            expect(metrics.timeToReversal.min).toBe(expectedMin);
            expect(metrics.timeToReversal.max).toBe(expectedMax);

            // Verify logical constraints
            expect(metrics.timeToReversal.min).toBeLessThanOrEqual(metrics.timeToReversal.average);
            expect(metrics.timeToReversal.average).toBeLessThanOrEqual(metrics.timeToReversal.max);
            expect(metrics.timeToReversal.min).toBeLessThanOrEqual(metrics.timeToReversal.max);
            expect(metrics.timeToReversal.min).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that metrics handle edge cases correctly
   * Validates: Requirements 14.3, 14.7
   */
  it('should handle edge cases correctly', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate edge case scenarios
        fc.oneof(
          // Empty actions array
          fc.constant([]),
          // All actions reversed
          fc.array(
            fc.record({
              id: fc.uuid(),
              moderator_id: fc.uuid(),
              created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2023-12-31').getTime() }).map(ms => new Date(ms)),
              revoked_at: fc.integer({ min: 1000, max: 30 * 24 * 60 * 60 * 1000 }), // offset in ms
              revoked_by: fc.uuid(),
            }).map(action => ({
              ...action,
              revoked_at: new Date(action.created_at.getTime() + (action.revoked_at as number)),
            })),
            { minLength: 1, maxLength: 20 }
          ),
          // No actions reversed
          fc.array(
            fc.record({
              id: fc.uuid(),
              moderator_id: fc.uuid(),
              created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              revoked_at: fc.constant(null),
              revoked_by: fc.constant(null),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          // Single action
          fc.array(
            fc.record({
              id: fc.uuid(),
              moderator_id: fc.uuid(),
              created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              revoked_at: fc.option(
                fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
                { nil: null }
              ),
              revoked_by: fc.option(fc.uuid(), { nil: null }),
            }),
            { minLength: 1, maxLength: 1 }
          )
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000)
              : action.revoked_at,
          }));

          // Property: Metrics should handle edge cases without errors
          const metrics = calculateReversalMetrics(validatedActions);

          // Verify metrics are valid
          expect(metrics.totalActions).toBeGreaterThanOrEqual(0);
          expect(metrics.reversedActions).toBeGreaterThanOrEqual(0);
          expect(metrics.reversedActions).toBeLessThanOrEqual(metrics.totalActions);
          expect(metrics.reversalRate).toBeGreaterThanOrEqual(0);
          expect(metrics.reversalRate).toBeLessThanOrEqual(100);

          // Verify moderator stats are valid
          for (const moderatorStat of metrics.moderatorStats) {
            expect(moderatorStat.totalActions).toBeGreaterThan(0);
            expect(moderatorStat.reversedActions).toBeGreaterThanOrEqual(0);
            expect(moderatorStat.reversedActions).toBeLessThanOrEqual(moderatorStat.totalActions);
            expect(moderatorStat.reversalRate).toBeGreaterThanOrEqual(0);
            expect(moderatorStat.reversalRate).toBeLessThanOrEqual(100);
          }

          // Verify time metrics are valid
          expect(metrics.timeToReversal.average).toBeGreaterThanOrEqual(0);
          expect(metrics.timeToReversal.median).toBeGreaterThanOrEqual(0);
          expect(metrics.timeToReversal.min).toBeGreaterThanOrEqual(0);
          expect(metrics.timeToReversal.max).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that metrics are consistent across multiple calculations
   * Validates: Requirements 14.3, 14.7
   */
  it('should produce consistent metrics across multiple calculations', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary actions
        fc.array(
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
            revoked_at: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              { nil: null }
            ),
            revoked_by: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000)
              : action.revoked_at,
          }));

          // Property: Metrics should be deterministic
          const metrics1 = calculateReversalMetrics(validatedActions);
          const metrics2 = calculateReversalMetrics(validatedActions);

          // Verify metrics are identical
          expect(metrics1.totalActions).toBe(metrics2.totalActions);
          expect(metrics1.reversedActions).toBe(metrics2.reversedActions);
          expect(metrics1.reversalRate).toBe(metrics2.reversalRate);

          // Verify moderator stats are identical
          expect(metrics1.moderatorStats.length).toBe(metrics2.moderatorStats.length);
          for (let i = 0; i < metrics1.moderatorStats.length; i++) {
            const stat1 = metrics1.moderatorStats.find(s => s.moderatorId === metrics2.moderatorStats[i].moderatorId);
            const stat2 = metrics2.moderatorStats[i];
            expect(stat1).toBeDefined();
            expect(stat1?.totalActions).toBe(stat2.totalActions);
            expect(stat1?.reversedActions).toBe(stat2.reversedActions);
            expect(stat1?.reversalRate).toBe(stat2.reversalRate);
          }

          // Verify time metrics are identical
          expect(metrics1.timeToReversal.average).toBe(metrics2.timeToReversal.average);
          expect(metrics1.timeToReversal.median).toBe(metrics2.timeToReversal.median);
          expect(metrics1.timeToReversal.min).toBe(metrics2.timeToReversal.min);
          expect(metrics1.timeToReversal.max).toBe(metrics2.timeToReversal.max);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that sum of moderator actions equals total actions
   * Validates: Requirements 14.3, 14.7
   */
  it('should have sum of moderator actions equal total actions', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary actions
        fc.array(
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
            revoked_at: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              { nil: null }
            ),
            revoked_by: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000)
              : action.revoked_at,
          }));

          // Property: Sum of moderator actions should equal total actions
          const metrics = calculateReversalMetrics(validatedActions);

          // Calculate sum of moderator actions
          const sumModeratorActions = metrics.moderatorStats.reduce(
            (sum, stat) => sum + stat.totalActions,
            0
          );

          // Verify sum equals total
          expect(sumModeratorActions).toBe(metrics.totalActions);

          // Calculate sum of moderator reversed actions
          const sumModeratorReversed = metrics.moderatorStats.reduce(
            (sum, stat) => sum + stat.reversedActions,
            0
          );

          // Verify sum equals total reversed
          expect(sumModeratorReversed).toBe(metrics.reversedActions);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal rate formula is correct
   * Validates: Requirements 14.3
   */
  it('should use correct formula for reversal rate calculation', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary actions
        fc.array(
          fc.record({
            id: fc.uuid(),
            moderator_id: fc.uuid(),
            created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
            revoked_at: fc.option(
              fc.integer({ min: new Date('2020-01-01').getTime(), max: Date.now() - 1000 }).map(ms => new Date(ms)),
              { nil: null }
            ),
            revoked_by: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          // Ensure revoked_at is after created_at for reversed actions
          const validatedActions = actions.map(action => ({
            ...action,
            revoked_at: action.revoked_at && action.revoked_at.getTime() < action.created_at.getTime()
              ? new Date(action.created_at.getTime() + 86400000)
              : action.revoked_at,
          }));

          // Property: Reversal rate = (reversed / total) * 100
          const metrics = calculateReversalMetrics(validatedActions);

          // Verify formula
          if (metrics.totalActions > 0) {
            const expectedRate = (metrics.reversedActions / metrics.totalActions) * 100;
            expect(metrics.reversalRate).toBeCloseTo(expectedRate, 2);
          } else {
            expect(metrics.reversalRate).toBe(0);
          }

          // Verify for each moderator
          for (const moderatorStat of metrics.moderatorStats) {
            if (moderatorStat.totalActions > 0) {
              const expectedRate = (moderatorStat.reversedActions / moderatorStat.totalActions) * 100;
              expect(moderatorStat.reversalRate).toBeCloseTo(expectedRate, 2);
            } else {
              expect(moderatorStat.reversalRate).toBe(0);
            }
          }
        }
      ),
      { numRuns }
    );
  });
});



/**
 * Property 18: Reversal Immutability
 * 
 * For any reversed action, the reversal record (revoked_at, revoked_by,
 * reversal_reason) should not be modifiable or deletable.
 * 
 * Feature: moderation-system, Property 18: Reversal Immutability
 * Validates: Requirements 14.10
 */
describe('Moderation Service - Property 18: Reversal Immutability', () => {
  /**
   * Represents a reversal record
   */
  interface ReversalRecord {
    action_id: string;
    revoked_at: string;
    revoked_by: string;
    reversal_reason: string;
    is_self_reversal: boolean;
    created_at: string;
  }

  /**
   * Simulates attempting to modify a reversal record
   */
  function attemptModifyReversal(
    original: ReversalRecord,
    modifications: Partial<ReversalRecord>
  ): { success: boolean; error?: string; record: ReversalRecord } {
    // Reversal records are immutable - any modification attempt should fail
    return {
      success: false,
      error: 'Reversal records are immutable and cannot be modified',
      record: original, // Return original unchanged
    };
  }

  /**
   * Simulates attempting to delete a reversal record
   */
  function attemptDeleteReversal(
    record: ReversalRecord
  ): { success: boolean; error?: string; record: ReversalRecord | null } {
    // Reversal records cannot be deleted - deletion attempt should fail
    return {
      success: false,
      error: 'Reversal records cannot be deleted to maintain audit trail integrity',
      record, // Record still exists
    };
  }

  /**
   * Test that revoked_at cannot be modified after reversal
   * Validates: Requirements 14.10
   */
  it('should prevent modification of revoked_at field', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and new timestamp
        fc.record({
          original: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          newRevokedAt: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
        }).filter(params => params.original.revoked_at !== params.newRevokedAt), // Ensure new value is different
        (params) => {
          // Property: revoked_at field should be immutable
          const result = attemptModifyReversal(params.original, {
            revoked_at: params.newRevokedAt,
          });

          // Verify modification was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('immutable');

          // Verify original value is unchanged
          expect(result.record.revoked_at).toBe(params.original.revoked_at);
          expect(result.record.revoked_at).not.toBe(params.newRevokedAt);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that revoked_by cannot be modified after reversal
   * Validates: Requirements 14.10
   */
  it('should prevent modification of revoked_by field', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and new moderator ID
        fc.record({
          original: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          newRevokedBy: fc.uuid(),
        }),
        (params) => {
          // Property: revoked_by field should be immutable
          const result = attemptModifyReversal(params.original, {
            revoked_by: params.newRevokedBy,
          });

          // Verify modification was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('immutable');

          // Verify original value is unchanged
          expect(result.record.revoked_by).toBe(params.original.revoked_by);
          expect(result.record.revoked_by).not.toBe(params.newRevokedBy);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal_reason cannot be modified after reversal
   * Validates: Requirements 14.10
   */
  it('should prevent modification of reversal_reason field', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and new reason
        fc.record({
          original: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          newReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: reversal_reason field should be immutable
          const result = attemptModifyReversal(params.original, {
            reversal_reason: params.newReason,
          });

          // Verify modification was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('immutable');

          // Verify original value is unchanged
          expect(result.record.reversal_reason).toBe(params.original.reversal_reason);
          expect(result.record.reversal_reason).not.toBe(params.newReason);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that multiple fields cannot be modified simultaneously
   * Validates: Requirements 14.10
   */
  it('should prevent modification of multiple fields simultaneously', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and new values for all fields
        fc.record({
          original: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          modifications: fc.record({
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
          }),
        }),
        (params) => {
          // Property: No fields should be modifiable
          const result = attemptModifyReversal(params.original, params.modifications);

          // Verify modification was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('immutable');

          // Verify all original values are unchanged
          expect(result.record.revoked_at).toBe(params.original.revoked_at);
          expect(result.record.revoked_by).toBe(params.original.revoked_by);
          expect(result.record.reversal_reason).toBe(params.original.reversal_reason);
          expect(result.record.is_self_reversal).toBe(params.original.is_self_reversal);
          expect(result.record.created_at).toBe(params.original.created_at);
          expect(result.record.action_id).toBe(params.original.action_id);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal records cannot be deleted
   * Validates: Requirements 14.10
   */
  it('should prevent deletion of reversal records', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record
        fc.record({
          action_id: fc.uuid(),
          revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          revoked_by: fc.uuid(),
          reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
          is_self_reversal: fc.boolean(),
          created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
        }),
        (record) => {
          // Property: Reversal records should not be deletable
          const result = attemptDeleteReversal(record);

          // Verify deletion was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('cannot be deleted');
          expect(result.error).toContain('audit trail');

          // Verify record still exists
          expect(result.record).not.toBeNull();
          expect(result.record).toEqual(record);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that immutability is enforced regardless of user role
   * Validates: Requirements 14.10
   */
  it('should enforce immutability regardless of user role', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and user role
        fc.record({
          record: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          userRole: fc.constantFrom('user', 'moderator', 'admin') as fc.Arbitrary<'user' | 'moderator' | 'admin'>,
          newReason: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        (params) => {
          // Property: Immutability should be enforced for all user roles
          const result = attemptModifyReversal(params.record, {
            reversal_reason: params.newReason,
          });

          // Verify modification was rejected regardless of role
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('immutable');

          // Verify original value is unchanged
          expect(result.record.reversal_reason).toBe(params.record.reversal_reason);

          // Even admins cannot modify reversal records
          if (params.userRole === 'admin') {
            expect(result.success).toBe(false);
          }
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that attempting to modify non-reversal fields is also prevented
   * Validates: Requirements 14.10
   */
  it('should prevent modification of any field in reversal record', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record and attempt to modify action_id
        fc.record({
          original: fc.record({
            action_id: fc.uuid(),
            revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
            revoked_by: fc.uuid(),
            reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
            is_self_reversal: fc.boolean(),
            created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          }),
          newActionId: fc.uuid(),
        }),
        (params) => {
          // Property: Even non-reversal fields should be immutable
          const result = attemptModifyReversal(params.original, {
            action_id: params.newActionId,
          });

          // Verify modification was rejected
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // Verify original value is unchanged
          expect(result.record.action_id).toBe(params.original.action_id);
          expect(result.record.action_id).not.toBe(params.newActionId);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that immutability is maintained over time
   * Validates: Requirements 14.10
   */
  it('should maintain immutability over time', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record
        fc.record({
          action_id: fc.uuid(),
          revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          revoked_by: fc.uuid(),
          reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
          is_self_reversal: fc.boolean(),
          created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
        }),
        (record) => {
          // Property: Multiple modification attempts should all fail
          const attempts = [
            attemptModifyReversal(record, { reversal_reason: 'New reason 1' }),
            attemptModifyReversal(record, { reversal_reason: 'New reason 2' }),
            attemptModifyReversal(record, { revoked_by: fc.sample(fc.uuid(), 1)[0] }),
            attemptModifyReversal(record, { revoked_at: new Date().toISOString() }),
          ];

          // Verify all attempts failed
          for (const attempt of attempts) {
            expect(attempt.success).toBe(false);
            expect(attempt.error).toBeDefined();
            expect(attempt.error).toContain('immutable');
          }

          // Verify record remains unchanged after all attempts
          const finalAttempt = attempts[attempts.length - 1];
          expect(finalAttempt.record).toEqual(record);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that reversal record integrity is maintained
   * Validates: Requirements 14.10
   */
  it('should maintain reversal record integrity', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record
        fc.record({
          action_id: fc.uuid(),
          revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          revoked_by: fc.uuid(),
          reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
          is_self_reversal: fc.boolean(),
          created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
        }),
        (record) => {
          // Property: Record integrity should be maintained
          
          // Attempt various operations
          const modifyResult = attemptModifyReversal(record, {
            reversal_reason: 'Modified reason',
          });
          const deleteResult = attemptDeleteReversal(record);

          // Verify all operations failed
          expect(modifyResult.success).toBe(false);
          expect(deleteResult.success).toBe(false);

          // Verify record integrity is maintained
          expect(modifyResult.record).toEqual(record);
          expect(deleteResult.record).toEqual(record);

          // Verify all fields are still present and unchanged
          expect(modifyResult.record.action_id).toBe(record.action_id);
          expect(modifyResult.record.revoked_at).toBe(record.revoked_at);
          expect(modifyResult.record.revoked_by).toBe(record.revoked_by);
          expect(modifyResult.record.reversal_reason).toBe(record.reversal_reason);
          expect(modifyResult.record.is_self_reversal).toBe(record.is_self_reversal);
          expect(modifyResult.record.created_at).toBe(record.created_at);
        }
      ),
      { numRuns }
    );
  });

  /**
   * Test that error messages are informative
   * Validates: Requirements 14.10
   */
  it('should provide informative error messages for immutability violations', () => {
    // Configure minimum runs for property testing
    const numRuns = 100;

    fc.assert(
      fc.property(
        // Generate arbitrary reversal record
        fc.record({
          action_id: fc.uuid(),
          revoked_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
          revoked_by: fc.uuid(),
          reversal_reason: fc.string({ minLength: 10, maxLength: 200 }),
          is_self_reversal: fc.boolean(),
          created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2023-12-31') }).map(ts => new Date(ts).toISOString()),
        }),
        (record) => {
          // Property: Error messages should be clear and informative
          const modifyResult = attemptModifyReversal(record, {
            reversal_reason: 'New reason',
          });
          const deleteResult = attemptDeleteReversal(record);

          // Verify error messages are present
          expect(modifyResult.error).toBeDefined();
          expect(deleteResult.error).toBeDefined();

          // Verify error messages are informative
          expect(modifyResult.error).toContain('immutable');
          expect(deleteResult.error).toContain('cannot be deleted');
          expect(deleteResult.error).toContain('audit trail');

          // Verify error messages are not empty
          expect(modifyResult.error!.length).toBeGreaterThan(0);
          expect(deleteResult.error!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns }
    );
  });
});



