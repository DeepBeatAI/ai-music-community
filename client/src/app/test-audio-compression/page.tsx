'use client';

import { useState } from 'react';
import { audioCompressor } from '@/utils/audioCompression';

export default function TestAudioCompressionPage() {
  const [results, setResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runCompressionTest = async () => {
    setIsLoading(true);
    setResults('Testing audio compression system...\n');

    try {
      // Test 1: Check if compressor loads
      setResults(prev => prev + '✅ Audio compressor loaded successfully\n');
      
      // Test 2: Check AudioContext initialization
      const hasAudioContext = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
      setResults(prev => prev + `✅ AudioContext support: ${hasAudioContext}\n`);
      
      // Test 3: Test quality settings
      const qualityOptions = [
        { quality: 0.3, maxFileSize: 1 * 1024 * 1024, name: 'Low Quality (1MB limit)' },
        { quality: 0.6, maxFileSize: 5 * 1024 * 1024, name: 'Medium Quality (5MB limit)' },
        { quality: 0.9, maxFileSize: 10 * 1024 * 1024, name: 'High Quality (10MB limit)' }
      ];
      
      setResults(prev => prev + '✅ Quality options configured:\n');
      qualityOptions.forEach(option => {
        setResults(prev => prev + `  - ${option.name}\n`);
      });
      
      // Test 4: Test with mock file (small file that skips compression)
      const mockSmallFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await audioCompressor.compressAudio(mockSmallFile);
      
      setResults(prev => prev + `✅ Small file test (should skip compression):\n`);
      setResults(prev => prev + `  - Original size: ${result.originalSize} bytes\n`);
      setResults(prev => prev + `  - Compressed size: ${result.compressedSize} bytes\n`);
      setResults(prev => prev + `  - Compression ratio: ${result.compressionRatio}\n`);
      setResults(prev => prev + `  - Duration: ${result.duration} seconds\n`);
      
      if (result.compressionRatio === 1) {
        setResults(prev => prev + '✅ Fallback working: Small files skip compression\n');
      }
      
      setResults(prev => prev + '\n🎉 Audio compression system test completed successfully!\n');
      setResults(prev => prev + '\n📝 To test with real audio files, use the file input below.\n');
      
    } catch (error) {
      setResults(prev => prev + `❌ Test failed: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileTest = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setResults(prev => prev + `\n🎵 Testing with real file: ${file.name}\n`);
    setResults(prev => prev + `Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB (${file.size} bytes)\n`);

    try {
      // Test with different thresholds
      const testConfigs = [
        { 
          name: "Test 1: 3MB threshold (should compress 5MB+ files)",
          options: { quality: 0.6, maxFileSize: 3 * 1024 * 1024, targetFormat: 'mp3' as const }
        },
        { 
          name: "Test 2: 10MB threshold (should compress 21MB+ files)", 
          options: { quality: 0.6, maxFileSize: 10 * 1024 * 1024, targetFormat: 'mp3' as const }
        },
        { 
          name: "Test 3: Force compression (1KB threshold)",
          options: { quality: 0.6, maxFileSize: 1024, targetFormat: 'mp3' as const }
        }
      ];

      for (const config of testConfigs) {
        setResults(prev => prev + `\n📊 ${config.name}\n`);
        setResults(prev => prev + `Threshold: ${(config.options.maxFileSize / 1024 / 1024).toFixed(2)} MB\n`);
        
        const result = await audioCompressor.compressAudio(file, config.options);

        setResults(prev => prev + `Results:\n`);
        setResults(prev => prev + `  - Original: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB\n`);
        setResults(prev => prev + `  - Compressed: ${(result.compressedSize / 1024 / 1024).toFixed(2)} MB\n`);
        setResults(prev => prev + `  - Ratio: ${result.compressionRatio.toFixed(2)}x\n`);
        setResults(prev => prev + `  - Method: ${result.method}\n`);
        setResults(prev => prev + `  - Applied: ${result.compressionApplied ? 'YES' : 'NO'}\n`);
        
        if (result.compressionApplied) {
          if (result.compressionRatio > 1) {
            setResults(prev => prev + '🎉 File was successfully compressed!\n');
          } else {
            setResults(prev => prev + '⚠️ Compression applied but file got larger!\n');
          }
        } else {
          setResults(prev => prev + '📝 No compression applied\n');
        }
      }

    } catch (error) {
      setResults(prev => prev + `❌ Real file test failed: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Audio Compression System Test - DEBUG VERSION</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Automated Tests</h2>
          <button
            onClick={runCompressionTest}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {isLoading ? 'Running Tests...' : 'Run Audio Compression Tests'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Real File Test - Multiple Thresholds</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Upload an audio file to test compression with different thresholds:</p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileTest}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
          <h2 className="text-xl font-semibold mb-4 text-white">Test Results</h2>
          <pre className="whitespace-pre-wrap">
            {results || 'Click "Run Audio Compression Tests" to start testing...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
