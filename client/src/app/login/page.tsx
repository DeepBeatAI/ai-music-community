'use client'
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/utils/validation';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';

export default function LoginPage() {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Basic validation
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 1) {
      setError('Please enter your password');
      setIsSubmitting(false);
      return;
    }

    // Attempt login
    const { error: signInError } = await signIn(formData.email, formData.password);

    if (signInError) {
      setError(signInError);
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <AuthLayout title="Loading..." subtitle="Please wait while we load your session">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Sign in to your AI Music Community account"
    >
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-400 text-white bg-gray-700 rounded focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-400 text-white bg-gray-700 rounded focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent 
            text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-blue-400 hover:text-blue-300">
              Create one here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}