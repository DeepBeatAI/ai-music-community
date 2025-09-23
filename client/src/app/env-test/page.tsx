'use client';

export default function EnvTest() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">🔧 Environment Variables Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">Supabase URL:</h2>
          <p className="text-sm font-mono break-all">
            {supabaseUrl ? (
              <span className="text-green-400">✅ {supabaseUrl}</span>
            ) : (
              <span className="text-red-400">❌ Missing</span>
            )}
          </p>
        </div>
        
        <div className="p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">Supabase Anon Key:</h2>
          <p className="text-sm font-mono break-all">
            {supabaseKey ? (
              <span className="text-green-400">✅ Present (first 20 chars: {supabaseKey.substring(0, 20)}...)</span>
            ) : (
              <span className="text-red-400">❌ Missing</span>
            )}
          </p>
        </div>
        
        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded">
          <h2 className="text-blue-400 font-bold mb-2">📝 Results</h2>
          <div className="text-blue-300">
            {supabaseUrl && supabaseKey ? (
              <p>✅ Both environment variables are properly configured!</p>
            ) : (
              <p>❌ Some environment variables are missing</p>
            )}
          </div>
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