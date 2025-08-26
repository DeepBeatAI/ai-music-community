'use client'
import { useEffect, useState } from 'react';
import AuthLayout from '@/components/layout/AuthLayout';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if we're on the client side and have URL parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const type = urlParams.get('type');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || 'Email verification failed. Please try again.');
      } else if (type === 'signup' || token) {
        setStatus('success');
        setMessage('Email verified successfully! You can now sign in to your account.');
      } else {
        setStatus('error');
        setMessage('Invalid verification link or the link has expired.');
      }
    }
  }, []);

  return (
    <AuthLayout title="Email Verification" subtitle="Confirming your email address">
      <div className="text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400">Verifying your email...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-6">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">
                Email Verified!
              </h3>
              <p className="text-gray-300 mb-6">{message}</p>
              
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Continue to Sign In
              </Link>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-red-400 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-300 mb-6">{message}</p>
              
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Try Signing Up Again
                </Link>
                
                <Link
                  href="/login"
                  className="block px-6 py-3 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-md font-medium transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}