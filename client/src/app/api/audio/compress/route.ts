import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import ffmpeg from 'fluent-ffmpeg';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configure FFmpeg paths explicitly for Windows
const isWindows = process.platform === 'win32';

if (isWindows) {
  const possiblePaths = [
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\ffmpeg\\ffmpeg.exe',
    'ffmpeg.exe',
    'ffmpeg'
  ];
  
  console.log('🔧 Configuring FFmpeg for Windows...');
  
  let ffmpegPath = 'ffmpeg';
  for (const path of possiblePaths) {
    try {
      if (path.includes('C:\\')) {
        await fs.access(path);
        ffmpegPath = path;
        console.log(`✅ Found FFmpeg at: ${path}`);
        break;
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log(`🎯 Set FFmpeg path to: ${ffmpegPath}`);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CompressionOptions {
  quality: 'high' | 'medium' | 'low';
  maxFileSize?: number;
  targetBitrate?: string;
}

interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration: number;
  bitrate: string;
  supabaseUrl?: string;
  error?: string;
  originalBitrate?: string;
  compressionApplied?: boolean;
}

interface AudioInfo {
  duration: number;
  bitrate: number;
  format: string;
  sampleRate: number;
  channels: number;
}

export async function POST(request: NextRequest) {
  let tempInputPath = '';
  let tempOutputPath = '';

  try {
    console.log('🎵 Audio compression API called');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const optionsStr = formData.get('options') as string;
    
    if (!file) {
      console.error('❌ No audio file provided');
      return NextResponse.json({ 
        success: false, 
        error: 'No audio file provided' 
      }, { status: 400 });
    }

    const options: CompressionOptions = optionsStr 
      ? JSON.parse(optionsStr) 
      : { quality: 'medium' };

    console.log(`📁 Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    if (!file.type.startsWith('audio/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json({ 
        success: false, 
        error: 'File must be an audio file' 
      }, { status: 400 });
    }

    // Create temporary file paths
    const tempDir = tmpdir();
    const timestamp = Date.now();
    const inputExtension = file.name.split('.').pop() || 'mp3';
    tempInputPath = join(tempDir, `input_${timestamp}.${inputExtension}`);
    tempOutputPath = join(tempDir, `output_${timestamp}.mp3`);

    console.log(`📂 Temp files: ${tempInputPath} → ${tempOutputPath}`);

    // Write uploaded file to temporary location
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempInputPath, Buffer.from(arrayBuffer));
    console.log('✅ File written to temp location');

    // STEP 1: Analyze original file to get its current bitrate
    const audioInfo = await getAudioInfo(tempInputPath);
    console.log(`📊 Original audio info:`, audioInfo);

    // STEP 2: Determine smart target bitrate
    const targetBitrate = getSmartTargetBitrate(options, file.size, audioInfo);
    const targetBitrateNum = parseInt(targetBitrate.replace('k', ''));

    console.log(`🎚️  Original bitrate: ${audioInfo.bitrate}kbps`);
    console.log(`🎚️  Target bitrate: ${targetBitrate} (${targetBitrateNum}kbps)`);

    // STEP 3: Check if compression makes sense
    if (targetBitrateNum >= audioInfo.bitrate * 0.9) {
      console.log(`📝 Skipping compression: target bitrate (${targetBitrateNum}kbps) is not significantly lower than original (${audioInfo.bitrate}kbps)`);
      
      return NextResponse.json({
        success: true,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 1,
        duration: audioInfo.duration,
        bitrate: `${audioInfo.bitrate}k (original)`,
        originalBitrate: `${audioInfo.bitrate}k`,
        compressionApplied: false,
        error: `No compression needed - original bitrate (${audioInfo.bitrate}kbps) is already low enough`
      } as CompressionResult);
    }

    // STEP 4: Proceed with compression
    console.log(`🔄 Proceeding with compression: ${audioInfo.bitrate}kbps → ${targetBitrateNum}kbps`);

    const compressionResult = await Promise.race([
      compressAudio(tempInputPath, tempOutputPath, targetBitrate, options),
      new Promise<{ success: boolean; error: string }>((resolve) => 
        setTimeout(() => {
          console.error('❌ Compression timeout after 10 minutes');
          resolve({ success: false, error: 'Compression timeout (10 minutes)' });
        }, 600000)
      )
    ]);

    if (!compressionResult.success) {
      console.error('❌ Compression failed:', compressionResult.error);
      throw new Error(compressionResult.error || 'Compression failed');
    }

    console.log('✅ Compression completed');

    // Check if output file exists
    const outputExists = await fs.access(tempOutputPath).then(() => true).catch(() => false);
    if (!outputExists) {
      throw new Error('Compressed file was not created by FFmpeg');
    }

    // Read compressed file
    const compressedBuffer = await fs.readFile(tempOutputPath);
    const compressedSize = compressedBuffer.length;

    console.log(`📊 Size comparison: ${file.size} → ${compressedSize} bytes`);
    
    const compressionRatio = file.size / compressedSize;
    console.log(`📊 Compression ratio: ${compressionRatio.toFixed(2)}x`);

    // Upload compressed file to Supabase Storage
    const fileName = `compressed_${timestamp}_${file.name.replace(/\.[^/.]+$/, '')}.mp3`;
    console.log(`📤 Uploading to Supabase: ${fileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(fileName, compressedBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(fileName);

    const result: CompressionResult = {
      success: true,
      originalSize: file.size,
      compressedSize,
      compressionRatio,
      duration: audioInfo.duration,
      bitrate: targetBitrate,
      originalBitrate: `${audioInfo.bitrate}k`,
      compressionApplied: true,
      supabaseUrl: urlData.publicUrl
    };

    console.log(`🎉 Compression successful: ${compressionRatio.toFixed(2)}x reduction`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('💥 Audio compression error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      duration: 0,
      bitrate: ''
    } as CompressionResult, { status: 500 });

  } finally {
    // Cleanup temporary files
    console.log('🧹 Cleaning up temp files...');
    try {
      if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
      if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});
    } catch (cleanupError) {
      console.warn('⚠️  Failed to cleanup temp files:', cleanupError);
    }
  }
}

async function getAudioInfo(filePath: string): Promise<AudioInfo> {
  try {
    console.log(`🔍 Analyzing audio file: ${filePath}`);
    
    // Use ffprobe to get detailed audio information
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    const { stdout } = await execAsync(command);
    
    const info = JSON.parse(stdout);
    const audioStream = info.streams.find((stream: any) => stream.codec_type === 'audio');
    
    if (!audioStream) {
      throw new Error('No audio stream found in file');
    }

    const duration = parseFloat(info.format.duration) || 0;
    const bitrate = Math.round(parseInt(info.format.bit_rate || '0') / 1000); // Convert to kbps
    const sampleRate = parseInt(audioStream.sample_rate) || 0;
    const channels = parseInt(audioStream.channels) || 0;
    const format = info.format.format_name || 'unknown';

    console.log(`📊 Audio analysis complete:`, {
      duration: `${duration.toFixed(1)}s`,
      bitrate: `${bitrate}kbps`,
      sampleRate: `${sampleRate}Hz`,
      channels,
      format
    });

    return {
      duration,
      bitrate,
      format,
      sampleRate,
      channels
    };

  } catch (error) {
    console.error('❌ Failed to analyze audio file:', error);
    
    // Fallback: estimate bitrate from file size and duration
    try {
      const stats = await fs.stat(filePath);
      const audio = new Audio();
      
      // This is a rough estimate - not perfect but better than nothing
      const estimatedBitrate = Math.round((stats.size * 8) / (1800 * 1000)); // Assume ~30 minutes
      
      console.log(`📊 Using estimated bitrate: ${estimatedBitrate}kbps`);
      
      return {
        duration: 1800, // 30 minutes estimate
        bitrate: estimatedBitrate,
        format: 'mp3',
        sampleRate: 44100,
        channels: 2
      };
    } catch (fallbackError) {
      console.error('❌ Fallback analysis also failed:', fallbackError);
      
      // Last resort defaults
      return {
        duration: 0,
        bitrate: 128, // Assume reasonable default
        format: 'mp3',
        sampleRate: 44100,
        channels: 2
      };
    }
  }
}

function getSmartTargetBitrate(options: CompressionOptions, fileSize: number, audioInfo: AudioInfo): string {
  if (options.targetBitrate) {
    console.log(`🎯 Using specified bitrate: ${options.targetBitrate}`);
    return options.targetBitrate;
  }

  const currentBitrate = audioInfo.bitrate;
  const fileSizeMB = fileSize / (1024 * 1024);
  
  console.log(`🧮 Smart bitrate calculation:`);
  console.log(`  - Current bitrate: ${currentBitrate}kbps`);
  console.log(`  - File size: ${fileSizeMB.toFixed(2)}MB`);
  console.log(`  - Quality setting: ${options.quality}`);

  // Define reduction factors based on quality
  const reductionFactors = {
    'high': 0.8,    // Reduce to 80% of original (gentle compression)
    'medium': 0.65, // Reduce to 65% of original (moderate compression)
    'low': 0.5      // Reduce to 50% of original (aggressive compression)
  };

  const factor = reductionFactors[options.quality];
  let targetBitrate = Math.round(currentBitrate * factor);

  // Set reasonable bounds
  const minBitrate = 64;  // Don't go below 64kbps
  const maxBitrate = 256; // Don't exceed 256kbps

  targetBitrate = Math.max(minBitrate, Math.min(maxBitrate, targetBitrate));

  const result = `${targetBitrate}k`;
  console.log(`🎯 Smart target bitrate: ${result} (${factor}x reduction factor)`);
  
  return result;
}

function compressAudio(
  inputPath: string, 
  outputPath: string, 
  bitrate: string,
  options: CompressionOptions
): Promise<{ success: boolean; duration?: number; error?: string }> {
  
  return new Promise((resolve) => {
    let duration = 0;
    let lastProgress = 0;
    let hasStarted = false;
    
    console.log(`🚀 Starting FFmpeg compression...`);
    console.log(`🎚️  Bitrate: ${bitrate}`);
    
    try {
      const ffmpegProcess = ffmpeg(inputPath)
        .audioBitrate(bitrate)
        .audioChannels(2)
        .audioFrequency(44100)
        .format('mp3')
        .audioCodec('libmp3lame')
        .audioFilters(['volume=1.0'])
        .on('start', (commandLine) => {
          hasStarted = true;
          console.log('🔧 FFmpeg started with command:', commandLine);
        })
        .on('progress', (progress) => {
          const percent = progress.percent || 0;
          if (percent > lastProgress + 10) {
            console.log(`⏳ Progress: ${percent.toFixed(1)}% (${progress.timemark})`);
            lastProgress = Math.floor(percent / 10) * 10;
          }
        })
        .on('codecData', (data) => {
          if (data.duration) {
            const durationParts = data.duration.split(':');
            if (durationParts.length === 3) {
              const hours = parseFloat(durationParts[0]) || 0;
              const minutes = parseFloat(durationParts[1]) || 0;
              const seconds = parseFloat(durationParts[2]) || 0;
              duration = hours * 3600 + minutes * 60 + seconds;
              console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
            }
          }
        })
        .on('end', () => {
          console.log('✅ FFmpeg compression completed successfully');
          resolve({ success: true, duration });
        })
        .on('error', (err, stdout, stderr) => {
          console.error('❌ FFmpeg error:', err.message);
          if (stderr) console.error('📤 FFmpeg stderr:', stderr);
          
          let errorMessage = `FFmpeg error: ${err.message}`;
          if (!hasStarted) {
            errorMessage += ' (FFmpeg failed to start)';
          }
          
          resolve({ success: false, error: errorMessage });
        })
        .save(outputPath);

    } catch (setupError) {
      console.error('❌ Failed to set up FFmpeg process:', setupError);
      resolve({ 
        success: false, 
        error: `Failed to start FFmpeg: ${setupError instanceof Error ? setupError.message : 'Unknown setup error'}` 
      });
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}