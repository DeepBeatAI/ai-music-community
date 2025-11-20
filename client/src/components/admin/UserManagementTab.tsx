'use client';

import { useState, useEffect } from 'react';
import {
  fetchAllUsers,
  fetchUserDetails,
  updateUserPlanTier,
  updateUserRoles,
  suspendUser,
  resetUserPassword,
} from '@/lib/adminService';
import type { AdminUserData } from '@/types/admin';

interface UserDetailModalProps {
  user: AdminUserData;
  onClose: () => void;
  onUpdate: () => void;
}

function UserDetailModal({ user, onClose, onUpdate }: UserDetailModalProps) {
  const [planTier, setPlanTier] = useState(user.plan_tier);
  const [roles, setRoles] = useState<string[]>(user.roles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSavePlanTier = async () => {
    if (planTier === user.plan_tier) return;

    setLoading(true);
    setError(null);

    try {
      await updateUserPlanTier(user.user_id, planTier);
      onUpdate();
      alert('Plan tier updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan tier');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (role: string) => {
    const rolesToAdd = roles.includes(role) ? [] : [role];
    const rolesToRemove = roles.includes(role) ? [role] : [];
    const newRoles = roles.includes(role)
      ? roles.filter((r) => r !== role)
      : [...roles, role];

    setLoading(true);
    setError(null);

    try {
      await updateUserRoles(user.user_id, rolesToAdd, rolesToRemove);
      setRoles(newRoles);
      onUpdate();
      alert('Roles updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!confirm(`Are you sure you want to suspend ${user.username}?`)) return;

    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    setLoading(true);
    setError(null);

    try {
      await suspendUser(user.user_id, reason);
      onUpdate();
      alert('User suspended successfully');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm(`Are you sure you want to reset password for ${user.username}?`)) return;

    setLoading(true);
    setError(null);

    try {
      await resetUserPassword(user.user_id, user.email);
      alert('Password reset email sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">User: {user.username}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Account Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Account Info</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Plan Tier:</span>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                  disabled={loading}
                >
                  <option value="free_user">Free User</option>
                  <option value="creator_pro">Creator Pro</option>
                  <option value="creator_premium">Creator Premium</option>
                </select>
                {planTier !== user.plan_tier && (
                  <button
                    onClick={handleSavePlanTier}
                    disabled={loading}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
              </div>
              <div>
                <span className="font-medium">Roles:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['moderator', 'tester'].map((role) => (
                    <label key={role} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={roles.includes(role)}
                        onChange={() => handleToggleRole(role)}
                        disabled={loading}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span className={user.is_suspended ? 'text-red-600' : 'text-green-600'}>
                  {user.is_suspended ? 'Suspended' : 'Active'}
                </span>
              </p>
            </div>
          </div>

          {/* Activity Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Activity (Last 30 Days)</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Posts</p>
                <p className="text-2xl font-bold">{user.activity_summary.posts_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Tracks</p>
                <p className="text-2xl font-bold">{user.activity_summary.tracks_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Albums</p>
                <p className="text-2xl font-bold">{user.activity_summary.albums_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Playlists</p>
                <p className="text-2xl font-bold">{user.activity_summary.playlists_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Comments</p>
                <p className="text-2xl font-bold">{user.activity_summary.comments_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Likes Given</p>
                <p className="text-2xl font-bold">{user.activity_summary.likes_given}</p>
              </div>
              <div>
                <p className="text-gray-600">Likes Received</p>
                <p className="text-2xl font-bold">{user.activity_summary.likes_received}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Active</p>
                <p className="text-sm font-medium">
                  {new Date(user.activity_summary.last_active).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Admin Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
              >
                Reset Password
              </button>
              {!user.is_suspended && (
                <button
                  onClick={handleSuspend}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Suspend Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function UserManagementTab() {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadUsers = async (pageNum: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAllUsers({ page: pageNum, pageSize: 50 });
      if (pageNum === 1) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [...prev, ...data.users]);
      }
      setHasMore(data.users.length === 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadUsers(nextPage);
  };

  const handleUserClick = async (user: AdminUserData) => {
    try {
      const details = await fetchUserDetails(user.user_id);
      setSelectedUser(details);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load user details');
    }
  };

  const handleUpdate = () => {
    loadUsers(1);
    setPage(1);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = planFilter === 'all' || user.plan_tier === planFilter;

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'none' && user.roles.length === 0) ||
      user.roles.includes(roleFilter);

    return matchesSearch && matchesPlan && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Plans</option>
          <option value="free_user">Free User</option>
          <option value="creator_pro">Creator Pro</option>
          <option value="creator_premium">Creator Premium</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="none">No Roles</option>
          <option value="moderator">Moderator</option>
          <option value="tester">Tester</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* User List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && page === 1 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.plan_tier.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {user.roles.length > 0 ? user.roles.join(', ') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleUserClick(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {hasMore && !loading && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
            >
              Load More
            </button>
          </div>
        )}

        {loading && page > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center text-gray-500">
            Loading more users...
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
