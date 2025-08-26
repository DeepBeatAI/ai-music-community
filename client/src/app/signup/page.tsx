'use client'
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword, validateUsername } from '@/utils/validation';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';

export default function SignupPage() {
  const { signUp, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]); // Clear errors when user starts typing
    setEmailVerificationSent(false); // Reset verification state when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setErrors([]);
  setEmailVerificationSent(false);

  console.log('=== SIGNUP FORM SUBMISSION ===');
  console.log('Form data:', formData);

  // Validate all fields
  const validationErrors: string[] = [];

  if (!validateEmail(formData.email)) {
    validationErrors.push('Please enter a valid email address');
  }

  const passwordErrors = validatePassword(formData.password);
  validationErrors.push(...passwordErrors);

  const usernameErrors = validateUsername(formData.username);
  validationErrors.push(...usernameErrors);

  if (formData.password !== formData.confirmPassword) {
    validationErrors.push('Passwords do not match');
  }

  if (validationErrors.length > 0) {
    console.log('Validation errors:', validationErrors);
    setErrors(validationErrors);
    setIsSubmitting(false);
    return;
  }

  // Attempt signup
  console.log('Calling signUp function...');
  const result = await signUp(formData.email, formData.password, formData.username);
  console.log('SignUp result:', result);

  if (result.data && result.error) {
    // This is the email verification case
    console.log('Email verification case detected');
    setErrors([]);
    setEmailVerificationSent(true);
    setUserEmail(formData.email);
    
    // Clear the form after successful signup
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: ''
    });
  } else if (result.error) {
    // This is a real error
    console.log('Real error detected:', result.error);
    setErrors([result.error]);
    setEmailVerificationSent(false);
  } else {
    // Success without email verification - AuthContext will handle redirect
    console.log('Signup successful - no email verification required');
  }

  setIsSubmitting(false);
};

  const handleResendVerification = async () => {
    if (!userEmail) return;
    
    try {
      const { error } = await signUp(userEmail, 'dummy', formData.username);
      if (!error) {
        alert('Verification email resent! Please check your inbox.');
      }
    } catch (err) {
      console.error('Error resending verification:', err);
    }
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

  // Show email verification success state
  if (emailVerificationSent) {
    return (
      <AuthLayout 
        title="Check Your Email" 
        subtitle="We've sent you a verification link"
      >
        <div className="text-center space-y-6">
          {/* Email Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Success Message */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Account Created Successfully!
            </h3>
            <p className="text-gray-300 mb-4">
              We've sent a verification link to:
            </p>
            <p className="text-blue-400 font-medium text-lg mb-4">
              {userEmail}
            </p>
            <p className="text-gray-400 text-sm">
              Click the link in your email to verify your account and complete registration.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-left">
            <h4 className="text-white font-medium mb-2">Next Steps:</h4>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Check your email inbox for a verification message</li>
              <li>Click the verification link in the email</li>
              <li>You'll be automatically signed in and redirected</li>
            </ol>
          </div>

          {/* Help Section */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">
              Don't see the email? Check your spam folder or
            </p>
            <button
              onClick={handleResendVerification}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium underline"
            >
              resend verification email
            </button>
          </div>

          {/* Back to Login */}
          <div className="pt-4 border-t border-gray-700">
            <Link 
              href="/login" 
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Show signup form
  return (
    <AuthLayout 
      title="Join AI Music Community" 
      subtitle="Create your account to start sharing AI music"
    >
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-400 text-white bg-gray-700 rounded focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              3-20 characters, letters, numbers, and underscores only
            </p>
          </div>

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
                focus:ring-blue-500 focus:border-blue-500 focus:z-10"
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
              autoComplete="new-password"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-400 text-white bg-gray-700 rounded focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              At least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 
                placeholder-gray-400 text-white bg-gray-700 rounded focus:outline-none 
                focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-900/20 border border-red-700 rounded p-4">
            <ul className="text-red-400 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
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
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}