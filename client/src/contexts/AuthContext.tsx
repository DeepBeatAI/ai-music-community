'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { UserProfile, ApiResponse } from '@/types'
import { UserTypeInfo, PlanTier, RoleType } from '@/types/userTypes'
import { fetchUserAllTypes, clearUserTypeCache } from '@/lib/userTypeService'
import { updateLastActive } from '@/utils/activity'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  userTypeInfo: UserTypeInfo | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<ApiResponse<any>>
  signUp: (email: string, password: string, username: string) => Promise<ApiResponse<any>>
  signOut: () => Promise<void>
  loading: boolean
  userTypeLoading: boolean
  userTypeError: string | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userTypeInfo, setUserTypeInfo] = useState<UserTypeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [userTypeLoading, setUserTypeLoading] = useState(false)
  const [userTypeError, setUserTypeError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If no profile exists, this is expected for new users
        if (error.code === 'PGRST116') {
          return null;
        }
        
        return null;
      }

      return data;
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      return null;
    }
  };

  const fetchUserTypeInfo = async (userId: string): Promise<void> => {
    setUserTypeLoading(true);
    setUserTypeError(null);

    try {
      const typeInfo = await fetchUserAllTypes(userId, true);
      
      // Build UserTypeInfo object
      const userTypeData: UserTypeInfo = {
        userId,
        planTier: typeInfo.planTier,
        roles: typeInfo.roles,
        isAdmin: typeInfo.roles.includes(RoleType.ADMIN),
        displayTypes: [
          typeInfo.planTier,
          ...typeInfo.roles
        ],
      };

      setUserTypeInfo(userTypeData);
    } catch (err) {
      console.error('Error fetching user type info:', err);
      setUserTypeError(err instanceof Error ? err.message : 'Failed to load user type information');
      
      // Set default values on error
      setUserTypeInfo({
        userId,
        planTier: PlanTier.FREE_USER,
        roles: [],
        isAdmin: false,
        displayTypes: [PlanTier.FREE_USER],
      });
    } finally {
      setUserTypeLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user.id);
      setProfile(profileData);
      
      // Clear cache and reload user type information
      clearUserTypeCache(user.id);
      await fetchUserTypeInfo(user.id);
    }
  };

  useEffect(() => {
  const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      // Check if this is a newly confirmed user who needs a profile
      if (currentSession.user.email_confirmed_at) {
        const pendingUsername = localStorage.getItem('pending_username');
        const pendingUserId = localStorage.getItem('pending_user_id');
        
        if (pendingUsername && pendingUserId === currentSession.user.id) {
          try {
            const { data: functionResult, error: functionError } = await supabase
              .rpc('create_user_profile_secure', {
                user_uuid: currentSession.user.id,
                user_name: pendingUsername
              });

            if (functionResult?.success) {
              // Clean up temporary storage
              localStorage.removeItem('pending_username');
              localStorage.removeItem('pending_user_id');
            } else {
              console.error('Failed to create profile after email confirmation:', functionResult);
            }
          } catch (error) {
            console.error('Error creating profile after confirmation:', error);
          }
        }
      }

      // Check if session was terminated by admin
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('user_sessions')
          .select('is_active')
          .eq('session_token', currentSession.access_token)
          .single();
        
        if (!sessionError && sessionData && !sessionData.is_active) {
          // Session was terminated by admin - sign user out
          await supabase.auth.signOut();
          setProfile(null);
          setUserTypeInfo(null);
          setUserTypeError(null);
          
          alert('Your session has been terminated by an administrator.');
          router.push('/login');
          setLoading(false);
          return;
        }
      } catch (sessionCheckError) {
        console.error('Failed to check session status:', sessionCheckError);
        // Continue anyway - don't block login if check fails
      }

      // Check if user is suspended
      const { data: suspensionData, error: suspensionError } = await supabase
        .rpc('check_user_suspension', { p_user_id: currentSession.user.id });
      
      if (!suspensionError && suspensionData && suspensionData.length > 0) {
        const suspension = suspensionData[0];
        
        if (suspension.is_suspended) {
          // User is suspended - sign them out
          await supabase.auth.signOut();
          setProfile(null);
          setUserTypeInfo(null);
          setUserTypeError(null);
          
          // Show suspension message
          const message = suspension.suspended_until
            ? `Your account has been suspended until ${new Date(suspension.suspended_until).toLocaleDateString()}. Reason: ${suspension.suspension_reason}`
            : `Your account has been permanently suspended. Reason: ${suspension.suspension_reason}`;
          
          alert(message);
          router.push('/login');
          setLoading(false);
          return;
        }
      }

      // Fetch user profile
      const profileData = await fetchUserProfile(currentSession.user.id);
      setProfile(profileData);

      // Fetch user type information
      await fetchUserTypeInfo(currentSession.user.id);

      // Update last_active timestamp on login/session restore
      updateLastActive(currentSession.user.id);

      // Create or update user session tracking
      try {
        // Get user's IP address
        let ipAddress = null;
        try {
          const ipResponse = await fetch('/api/get-ip');
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || null;
        } catch (ipError) {
          console.error('Failed to get IP address:', ipError);
          // Fallback to localhost if API fails
          ipAddress = '127.0.0.1';
        }

        const expiresAt = new Date(currentSession.expires_at! * 1000).toISOString();
        await supabase.from('user_sessions').upsert({
          user_id: currentSession.user.id,
          session_token: currentSession.access_token,
          expires_at: expiresAt,
          is_active: true,
          last_activity: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'session_token',
          ignoreDuplicates: false,
        });
      } catch (error) {
        console.error('Failed to track session:', error);
      }

      // Redirect logic for authenticated users
      if (['/login', '/signup'].includes(pathname)) {
        router.replace('/');
      }
    } else {
      setProfile(null);
      setUserTypeInfo(null);
      setUserTypeError(null);
      
      // Redirect logic for unauthenticated users
      const publicRoutes = ['/login', '/signup', '/', '/verify-email', '/discover'];
      if (!publicRoutes.includes(pathname)) {
        // Use push instead of replace to maintain browser history
        router.push('/login');
      }
    }

    setLoading(false);
  };

  // Get initial session
  supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
    handleAuthStateChange('INITIAL_SESSION', initialSession);
  }).catch((error) => {
    console.error('Error getting initial session:', error);
    setLoading(false);
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, changedSession) => {
      handleAuthStateChange(event, changedSession);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, [router, pathname]);

  // Update last_active and session activity periodically while user is active (every 10 seconds)
  // Also check if user has been banned
  useEffect(() => {
    if (!user || !session) return;

    const updateInterval = setInterval(async () => {
      console.log('Periodic check: Updating activity and checking ban status...');
      updateLastActive(user.id);
      
      // Check if user has been banned by checking the session in the database
      // The revoke_user_sessions function deletes sessions, so if session doesn't exist, user is banned
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('user_sessions')
          .select('is_active')
          .eq('session_token', session.access_token)
          .maybeSingle();
        
        console.log('Session check result:', { 
          sessionExists: !!sessionData, 
          isActive: sessionData?.is_active,
          error: sessionError?.message 
        });
        
        // If session doesn't exist or is not active, log out the user
        if (!sessionData || !sessionData.is_active) {
          console.log('Session revoked or inactive, logging out user');
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setUserTypeInfo(null);
          alert('Your account has been suspended. Please contact support.');
          router.push('/login');
          return;
        }
        
        // Update session last_activity
        await supabase
          .from('user_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('session_token', session.access_token)
          .eq('is_active', true);
      } catch (error) {
        console.error('Failed to check session status:', error);
      }
    }, 10 * 1000); // 10 seconds

    return () => clearInterval(updateInterval);
  }, [user, session, router]);

  // Automatic session refresh - refresh token 10 minutes before expiration
  useEffect(() => {
    if (!session) return;

    const expiresAt = new Date(session.expires_at! * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // If session is already expired or expires in less than 1 minute, don't set timer
    if (timeUntilExpiry < 60000) {
      console.log('Session expired or expiring soon, skipping auto-refresh');
      return;
    }
    
    // Refresh 10 minutes before expiration (or immediately if less than 10 minutes remain)
    const refreshTime = Math.max(0, timeUntilExpiry - (10 * 60 * 1000));
    
    console.log(`Auto-refresh scheduled in ${Math.round(refreshTime / 60000)} minutes`);
    
    const refreshTimer = setTimeout(async () => {
      console.log('Auto-refreshing session...');
      try {
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Failed to auto-refresh session:', error);
          // Don't show error to user - they'll be redirected to login on next action
        } else if (data.session) {
          console.log('Session auto-refreshed successfully');
          // Update the session in user_sessions table
          try {
            const newExpiresAt = new Date(data.session.expires_at! * 1000).toISOString();
            await supabase
              .from('user_sessions')
              .update({ 
                expires_at: newExpiresAt,
                last_activity: new Date().toISOString()
              })
              .eq('session_token', session.access_token);
          } catch (updateError) {
            console.error('Failed to update session expiration:', updateError);
          }
        }
      } catch (refreshError) {
        console.error('Error during auto-refresh:', refreshError);
      }
    }, refreshTime);

    return () => {
      clearTimeout(refreshTimer);
    };
  }, [session]);

  const signIn = async (email: string, password: string): Promise<ApiResponse<any>> => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        // Improve ban error message
        let errorMessage = result.error.message;
        if (errorMessage.toLowerCase().includes('banned') || errorMessage.toLowerCase().includes('ban')) {
          errorMessage = 'Your account has been suspended. Please contact support for assistance.';
        }
        return { data: null, error: errorMessage };
      }

      return { data: result.data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in';
      return { data: null, error: errorMessage };
    }
  }

  const signUp = async (email: string, password: string, username: string): Promise<ApiResponse<any>> => {
  try {
    // Step 1: Validate username format FIRST
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return { 
        data: null, 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' 
      };
    }

    // Step 2: Check if username is already taken BEFORE creating auth user
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username.trim())
      .single();

    // If we found a user, username is taken
    if (existingUser) {
      return { data: null, error: `Username '${username}' is already taken. Please choose a different username.` };
    }

    // If error is anything other than "no rows found", it's a real error
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database error during username check:', checkError);
      return { data: null, error: 'Unable to verify username availability. Please try again.' };
    }

    // Step 3: Create auth user (Supabase handles email validation and uniqueness)
    const { data, error } = await supabase.auth.signUp({ 
      email: email.trim(), 
      password 
    });

    if (error) {
      // Handle specific auth errors
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return { data: null, error: `An account with the email "${email}" already exists. Please sign in instead.` };
      }
      
      return { data: null, error: error.message };
    }

    // Step 4: Handle email confirmation flow
    if (data.user && !data.user.email_confirmed_at) {
      // Store username temporarily for later profile creation
      localStorage.setItem('pending_username', username.trim());
      localStorage.setItem('pending_user_id', data.user.id);
      
      // Return success with a special message indicating email verification needed
      return { 
        data: data, 
        error: `Account created! Please check your email (${email}) and click the verification link to complete your registration.`
      };
    }

    // Step 5: Create user profile immediately (if email confirmation is disabled)
    if (data.user && data.user.email_confirmed_at) {
      try {
        const { data: functionResult, error: functionError } = await supabase
          .rpc('create_user_profile_secure', {
            user_uuid: data.user.id,
            user_name: username.trim()
          });

        if (functionError) {
          console.error('Database function call failed:', functionError);
          return { 
            data: null, 
            error: 'Signup failed due to a technical issue. Please try again.' 
          };
        }

        if (!functionResult || !functionResult.success) {
          console.error('Profile creation failed:', functionResult);
          return { 
            data: null, 
            error: functionResult?.message || 'Profile creation failed.' 
          };
        }
      } catch (functionException) {
        console.error('Database function exception:', functionException);
        return { 
          data: null, 
          error: 'Signup failed due to a technical issue. Please try again.' 
        };
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Signup process exception:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during signup';
    return { data: null, error: errorMessage };
  }
}
  const signOut = async () => {
    try {
      // Mark current session as inactive before signing out
      if (session?.access_token) {
        try {
          await supabase.rpc('mark_session_inactive', {
            p_session_token: session.access_token
          });
        } catch (sessionError) {
          console.error('Failed to mark session as inactive:', sessionError);
        }
      }
      
      // Clear user type cache before signing out
      if (user) {
        clearUserTypeCache(user.id);
      }
      
      await supabase.auth.signOut();
      setProfile(null);
      setUserTypeInfo(null);
      setUserTypeError(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      userTypeInfo,
      isAdmin: userTypeInfo?.isAdmin || false,
      signIn, 
      signUp, 
      signOut, 
      loading,
      userTypeLoading,
      userTypeError,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}