'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import UserStatsCard from '@/components/UserStatsCard';
import { supabase } from '@/lib/supabase';
import { validateUsername } from '@/utils/validation';
import { syncMyStatsToDatabase } from '@/utils/userStats';

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Set initial username from profile
    if (profile) {
      setUsername(profile.username);
    }
  }, [user, profile, loading, router]);

  // Sync user stats when profile loads to ensure accuracy
  useEffect(() => {
    const syncStats = async () => {
      if (user && profile) {
        try {
          await syncMyStatsToDatabase();
          console.log('User stats synced on profile load');
        } catch (error) {
          console.error('Failed to sync user stats on profile load:', error);
        }
      }
    };

    syncStats();
  }, [user, profile]);

  // Refresh user statistics when profile loads
  // useEffect(() => {
  //   const refreshStats = async () => {
  //     if (user && profile) {
  //       // Refresh stats when profile loads to ensure accurate display
  //       try {
  //         await refreshUserStats(user.id);
  //         console.log('User stats refreshed for profile display');
  //       } catch (error) {
  //         console.error('Failed to refresh user stats:', error);
  //       }
  //     }
  //   };

  //   refreshStats();
  // }, [user, profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage('');
    setErrors([]);

    if (!user) {
      setErrors(['No authenticated user found.']);
      setFormLoading(false);
      return;
    }

    // Validate username
    const usernameErrors = validateUsername(username);
    if (usernameErrors.length > 0) {
      setErrors(usernameErrors);
      setFormLoading(false);
      return;
    }

    // Check if username is taken by another user
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('username, user_id')
      .eq('username', username)
      .single();

    if (existingUser && existingUser.user_id !== user.id) {
      setErrors(['Username is already taken by another user.']);
      setFormLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: username.trim() })
        .eq('user_id', user.id);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      await refreshProfile(); // Refresh the profile data in context
    } catch (error) {
      console.error('Error updating user profile:', error);
      setErrors(['Failed to update profile. Please try again.']);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors([]);
    setMessage('');
    // Reset username to original value
    if (profile) {
      setUsername(profile.username);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="min-h-screen p-4 text-white">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
            <p className="text-gray-400">Manage your account information</p>
          </div>

          {/* Profile Card */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            {/* Account Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">Account Information</h2>
              
              {/* Email - Read Only */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="bg-gray-700 px-4 py-3 rounded-md border border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">{user.email}</span>
                    <span className="text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
                      Read only
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {/* Account Status */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Account Status
                </label>
                <div className="bg-gray-700 px-4 py-3 rounded-md border border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Active
                    </span>
                    <span className="text-xs text-gray-400">
                      {user.email_confirmed_at ? 'Email verified' : 'Email pending verification'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Stats Section */}
            {profile && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-200">Community Stats</h2>
                <UserStatsCard 
                  userId={user.id}
                  username={profile.username}
                  variant="full"
                  className="mb-4"
                />
              </div>
            )}

            {/* Profile Information Section */}
            <div className="border-t border-gray-700 pt-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-200">Profile Information</h2>
              
              {/* Success/Error Messages */}
              {message && (
                <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-md">
                  <p className="text-green-400 text-sm">{message}</p>
                </div>
              )}

              {errors.length > 0 && (
                <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-md">
                  <ul className="text-red-400 text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isEditing ? (
                /* Display Mode */
                <div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="bg-gray-700 px-4 py-3 rounded-md border border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-200 font-medium">
                          {profile?.username || 'Loading...'}
                        </span>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      This is how other users will see you in the community.
                    </p>
                  </div>

                  {profile && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Member since:</span>
                        <p className="text-gray-200">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Last updated:</span>
                        <p className="text-gray-200">
                          {new Date(profile.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleUpdateProfile}>
                  <div className="mb-6">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      id="username"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={formLoading}
                      placeholder="Enter your username"
                      maxLength={20}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-gray-400">
                        3-20 characters, letters, numbers, and underscores only
                      </p>
                      <span className="text-xs text-gray-400">
                        {username.length}/20
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium 
                        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      disabled={formLoading}
                    >
                      {formLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2 text-gray-400 hover:text-gray-200 font-medium transition-colors"
                      disabled={formLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Additional Actions */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Account Actions</h2>
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-200 font-medium">Change Password</p>
                    <p className="text-sm text-gray-400">Update your account password</p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-200 font-medium">Download Your Data</p>
                    <p className="text-sm text-gray-400">Export your posts and profile information</p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}