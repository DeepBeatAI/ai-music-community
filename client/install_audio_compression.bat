@echo off
REM Server-Side Audio Compression Installation Script for Windows
REM Run this from your project root directory

echo 🎵 Installing Server-Side Audio Compression...
echo.

REM Navigate to client directory
cd client

echo 📦 Installing Node.js dependencies...
call npm install fluent-ffmpeg @types/fluent-ffmpeg multer @types/multer

echo.
echo 🔧 Checking FFmpeg installation...

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ FFmpeg is already installed
    ffmpeg -version 2>&1 | findstr "ffmpeg version"
) else (
    echo ❌ FFmpeg not found. Please install FFmpeg:
    echo.
    echo 1. Download from: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Extract to C:\ffmpeg
    echo 3. Add C:\ffmpeg\bin to your PATH environment variable
    echo 4. Restart command prompt and run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo 🌐 Checking Supabase configuration...

REM Check if .env.local exists
if exist ".env.local" (
    echo ✅ Found .env.local file
    
    findstr "NEXT_PUBLIC_SUPABASE_URL" .env.local >nul
    if %ERRORLEVEL% EQU 0 (
        findstr "SUPABASE_SERVICE_ROLE_KEY" .env.local >nul
        if %ERRORLEVEL% EQU 0 (
            echo ✅ Supabase environment variables found
        ) else (
            echo ⚠️  Missing SUPABASE_SERVICE_ROLE_KEY in .env.local
        )
    ) else (
        echo ⚠️  Missing NEXT_PUBLIC_SUPABASE_URL in .env.local
    )
) else (
    echo ⚠️  .env.local file not found
    echo Please create .env.local with your Supabase credentials
)

echo.
echo 🧪 Creating test file...

REM Create a simple test file
echo const { exec } = require('child_process'); > test_compression.js
echo console.log('Testing FFmpeg integration...'); >> test_compression.js
echo exec('ffmpeg -version', (error, stdout, stderr) =^> { >> test_compression.js
echo     if (error) { >> test_compression.js
echo         console.error('❌ FFmpeg test failed:', error); >> test_compression.js
echo         return; >> test_compression.js
echo     } >> test_compression.js
echo     console.log('✅ FFmpeg is working properly'); >> test_compression.js
echo     console.log('Version:', stdout.split('\n')[0]); >> test_compression.js
echo     require('fs').unlinkSync('test_compression.js'); >> test_compression.js
echo }); >> test_compression.js

echo 🚀 Running FFmpeg test...
node test_compression.js

echo.
echo 🎉 Installation complete!
echo.
echo Next steps:
echo 1. Start your development server: npm run dev
echo 2. Navigate to: http://localhost:3000/test-audio-compression
echo 3. Upload an audio file to test compression
echo.
echo 📖 Read AUDIO_COMPRESSION_SETUP.md for detailed usage instructions
echo.
pause