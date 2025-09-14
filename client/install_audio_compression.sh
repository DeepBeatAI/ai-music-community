#!/bin/bash

# Server-Side Audio Compression Installation Script
# Run this from your project root directory

echo "🎵 Installing Server-Side Audio Compression..."

# Navigate to client directory
cd client

echo "📦 Installing Node.js dependencies..."
npm install fluent-ffmpeg @types/fluent-ffmpeg multer @types/multer

echo "🔧 Checking FFmpeg installation..."

# Check if FFmpeg is installed
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg is already installed:"
    ffmpeg -version | head -1
else
    echo "❌ FFmpeg not found. Please install FFmpeg:"
    echo ""
    echo "Windows: Download from https://www.gyan.dev/ffmpeg/builds/"
    echo "macOS: brew install ffmpeg"
    echo "Linux: sudo apt install ffmpeg"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "🌐 Checking Supabase configuration..."

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ Found .env.local file"
    
    # Check for required environment variables
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "✅ Supabase environment variables found"
    else
        echo "⚠️  Missing Supabase environment variables in .env.local"
        echo "Please ensure you have:"
        echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
        echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    fi
else
    echo "⚠️  .env.local file not found"
    echo "Please create .env.local with your Supabase credentials"
fi

echo "🧪 Creating test file..."

# Create a simple test file to verify everything works
cat > test_compression.js << 'EOF'
const { exec } = require('child_process');
const fs = require('fs');

console.log('Testing FFmpeg integration...');

// Test FFmpeg command
exec('ffmpeg -version', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ FFmpeg test failed:', error);
        return;
    }
    
    console.log('✅ FFmpeg is working properly');
    console.log('Version:', stdout.split('\n')[0]);
    
    // Clean up
    fs.unlinkSync('test_compression.js');
});
EOF

echo "🚀 Running FFmpeg test..."
node test_compression.js

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Start your development server: npm run dev"
echo "2. Navigate to: http://localhost:3000/test-audio-compression" 
echo "3. Upload an audio file to test compression"
echo ""
echo "📖 Read AUDIO_COMPRESSION_SETUP.md for detailed usage instructions"