#!/bin/bash

# Audio Compression Integration Test
echo "🎵 Testing Audio Compression Integration..."

# Check if development server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Development server not running. Please run 'npm run dev' first."
    exit 1
fi

echo "✅ Development server is running"

# Check if compression API is accessible
if curl -s -X OPTIONS http://localhost:3000/api/audio/compress | grep -q "200\|204"; then
    echo "✅ Compression API is accessible"
else
    echo "❌ Compression API not accessible"
    exit 1
fi

echo "✅ Audio compression integration ready for testing!"
echo ""
echo "Manual testing steps:"
echo "1. Navigate to http://localhost:3000/dashboard"
echo "2. Click on 'Audio Post' tab"
echo "3. Upload an audio file larger than 3MB"
echo "4. Verify compression UI appears (spinning purple indicator)"
echo "5. Check that optimization status shows in file info"
echo "6. Confirm file upload completes successfully"
echo ""
echo "Expected results:"
echo "- Large files (>10MB): Should show significant compression"
echo "- Small files: May skip compression with 'already optimized' message"
echo "- All files: Should upload successfully regardless of compression outcome"