'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';

interface TestResult {
  posts: Post[] | null;
  count: number | null;
  success: boolean;
}

export default function TestSupabase() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testQuery() {
      try {
        console.log('🧪 Testing Supabase connection...');
        
        // Test 1: Basic posts query
        const { data: posts, error: postsError, count } = await supabase
          .from('posts')
          .select('id, created_at, content, user_id', { count: 'exact' })
          .limit(3);
        
        if (postsError) throw postsError;
        
        console.log('✅ Supabase query successful');
        console.log('Posts found:', posts?.length || 0);
        console.log('Total count:', count);
        
        setResult({
          posts: posts as Post[] || [],
          count,
          success: true
        });
        
      } catch (err) {
        console.error('❌ Supabase test failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    testQuery();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-gray-900 text-white min-h-screen">
        <h1 className="text-2xl font-bold mb-4">🧪 Supabase Connection Test</h1>
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Testing Supabase connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🧪 Supabase Connection Test</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded">
          <h2 className="text-red-400 font-bold mb-2">❌ Error:</h2>
          <p className="text-red-300">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded">
          <h2 className="text-green-400 font-bold mb-2">✅ Success!</h2>
          <div className="space-y-2">
            <p className="text-green-300">Posts found: {result.posts?.length || 0}</p>
            <p className="text-green-300">Total count: {result.count}</p>
            <p className="text-green-300">Connection: Working</p>
          </div>
        </div>
      )}
      
      {result?.posts && result.posts.length > 0 && (
        <div className="p-4 bg-gray-800 rounded">
          <h2 className="text-gray-300 font-bold mb-2">📊 Sample Posts:</h2>
          <pre className="text-sm text-gray-400 overflow-x-auto">
            {JSON.stringify(result.posts, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
        <h2 className="text-blue-400 font-bold mb-2">📝 Test Instructions</h2>
        <div className="text-blue-300 space-y-1">
          <p>1. ✅ If you see &quot;Success!&quot; - Supabase is working correctly</p>
          <p>2. ❌ If you see &quot;Error:&quot; - There&apos;s an issue with Supabase connection</p>
          <p>3. 🔍 Check browser console for detailed logs</p>
          <p>4. 📊 Sample posts should show your actual data</p>
        </div>
      </div>
      
      <div className="mt-4">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}