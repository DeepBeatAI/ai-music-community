import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

export async function GET() {
  try {
    console.log('🔧 Testing FFmpeg installation...');

    const results = {
      ffmpegVersion: '',
      systemTest: false,
      simpleConversionTest: false,
      tempDirAccess: false,
      error: null as string | null,
      warnings: [] as string[]
    };

    // Test 1: Check FFmpeg version
    try {
      console.log('📋 Testing FFmpeg version...');
      const { stdout: versionOutput } = await execAsync('ffmpeg -version');
      results.ffmpegVersion = versionOutput.split('\n')[0];
      results.systemTest = true;
      console.log('✅ FFmpeg version test passed:', results.ffmpegVersion);
    } catch (error) {
      console.error('❌ FFmpeg version test failed:', error);
      results.error = `FFmpeg not found or not in PATH: ${error}`;
      return NextResponse.json({
        success: false,
        message: 'FFmpeg is not installed or not accessible',
        details: results
      });
    }

    // Test 2: Check temp directory access
    try {
      console.log('📁 Testing temp directory access...');
      const tempDir = tmpdir();
      const testPath = join(tempDir, `ffmpeg_test_${Date.now()}.txt`);
      await fs.writeFile(testPath, 'test');
      await fs.unlink(testPath);
      results.tempDirAccess = true;
      console.log('✅ Temp directory access test passed');
    } catch (error) {
      console.error('❌ Temp directory test failed:', error);
      results.warnings.push(`Temp directory access issue: ${error}`);
    }

    // Test 3: Simple audio generation test
    try {
      console.log('🎵 Testing simple audio generation...');
      const tempDir = tmpdir();
      const outputPath = join(tempDir, `ffmpeg_test_${Date.now()}.mp3`);
      
      // Generate 1 second of 1kHz sine wave
      const command = `ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -y -ar 44100 -ab 128k "${outputPath}"`;
      console.log('🔧 Running command:', command);
      
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 }); // 30 second timeout
      
      // Check if file was created
      const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
      
      if (fileExists) {
        const stats = await fs.stat(outputPath);
        console.log(`✅ Generated test file: ${stats.size} bytes`);
        
        // Clean up
        await fs.unlink(outputPath).catch(() => {});
        results.simpleConversionTest = true;
      } else {
        throw new Error('Output file was not created');
      }
      
    } catch (error) {
      console.error('❌ Simple conversion test failed:', error);
      results.error = `FFmpeg conversion test failed: ${error}`;
      results.warnings.push('FFmpeg can run but may have issues with audio processing');
    }

    const success = results.systemTest && results.tempDirAccess && results.simpleConversionTest;

    return NextResponse.json({
      success,
      message: success 
        ? 'FFmpeg is fully functional and ready for audio compression' 
        : 'FFmpeg has some issues that may affect compression',
      details: results
    });

  } catch (error) {
    console.error('💥 FFmpeg diagnostic error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to run FFmpeg diagnostics',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: null
    }, { status: 500 });
  }
}