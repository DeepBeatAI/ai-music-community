'use client'
import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserFollowStatus, toggleUserFollow } from '@/utils/community';

interface FollowState {
  [userId: string]: {
    following: boolean;
    followerCount: number;
    followingCount: number;
  };
}

interface FollowContextType {
  followState: FollowState;
  toggleFollow: (userId: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  getFollowStatus: (userId: string) => { following: boolean; followerCount: number; followingCount: number };
  refreshFollowStatus: (userId: string) => Promise<void>;
  loading: boolean;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followState, setFollowState] = useState<FollowState>({});
  const [loading, setLoading] = useState(false);

  const refreshFollowStatus = useCallback(async (userId: string) => {
    if (!user || userId === user.id) return;

    try {
      const { data, error } = await getUserFollowStatus(userId, user.id);
      if (data && !error) {
        setFollowState(prev => ({
          ...prev,
          [userId]: {
            following: data.following,
            followerCount: data.followerCount,
            followingCount: data.followingCount
          }
        }));
      }
    } catch (error) {
      console.error('Error refreshing follow status:', error);
    }
  }, [user]);

  const toggleFollow = useCallback(async (userId: string, username?: string) => {
    if (!user || userId === user.id) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    setLoading(true);
    
    try {
      const currentStatus = followState[userId]?.following || false;
      
      // Optimistic update - update all instances immediately
      setFollowState(prev => ({
        ...prev,
        [userId]: {
          following: !currentStatus,
          followerCount: currentStatus 
            ? (prev[userId]?.followerCount || 0) - 1 
            : (prev[userId]?.followerCount || 0) + 1,
          followingCount: prev[userId]?.followingCount || 0
        }
      }));

      const { data, error } = await toggleUserFollow(userId, user.id, currentStatus);
      
      if (error || !data) {
        // Revert optimistic update on error
        setFollowState(prev => ({
          ...prev,
          [userId]: {
            following: currentStatus,
            followerCount: currentStatus 
              ? (prev[userId]?.followerCount || 0) + 1 
              : (prev[userId]?.followerCount || 0) - 1,
            followingCount: prev[userId]?.followingCount || 0
          }
        }));
        
        return { success: false, error: error || 'Failed to update follow status' };
      }

      // Confirm with server response
      setFollowState(prev => ({
        ...prev,
        [userId]: {
          following: data.following,
          followerCount: data.followerCount,
          followingCount: prev[userId]?.followingCount || 0
        }
      }));

      return { success: true };
    } catch (err) {
      console.error('Follow toggle error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [user, followState]);

  // FIXED: Memoize getFollowStatus to prevent infinite re-renders
  const getFollowStatus = useCallback((userId: string) => {
    return followState[userId] || {
      following: false,
      followerCount: 0,
      followingCount: 0
    };
  }, [followState]);

  return (
    <FollowContext.Provider value={{
      followState,
      toggleFollow,
      getFollowStatus,
      refreshFollowStatus,
      loading
    }}>
      {children}
    </FollowContext.Provider>
  );
}

export const useFollow = () => {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};
