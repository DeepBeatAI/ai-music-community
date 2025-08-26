'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { UserProfile, ApiResponse } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<ApiResponse<any>>
  signUp: (email: string, password: string, username: string) => Promise<ApiResponse<any>>
  signOut: () => Promise<void>
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
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

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchUserProfile(user.id);
      setProfile(profileData);
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

      // Fetch user profile
      const profileData = await fetchUserProfile(currentSession.user.id);
      setProfile(profileData);

      // Redirect logic for authenticated users
      if (['/login', '/signup'].includes(pathname)) {
        router.replace('/');
      }
    } else {
      setProfile(null);
      // Redirect logic for unauthenticated users
      const publicRoutes = ['/login', '/signup', '/', '/verify-email', '/discover'];
      if (!publicRoutes.includes(pathname)) {
        router.replace('/login');
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

  const signIn = async (email: string, password: string): Promise<ApiResponse<any>> => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        return { data: null, error: result.error.message };
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
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      signIn, 
      signUp, 
      signOut, 
      loading, 
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