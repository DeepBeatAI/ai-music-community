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

  // Define reduction factors based on quality (more differentiated)
  const reductionFactors = {
    'high': 0.85,   // Reduce to 85% of original (gentle compression)
    'medium': 0.7,  // Reduce to 70% of original (moderate compression)
    'low': 0.55     // Reduce to 55% of original (aggressive compression)
  };

  const factor = reductionFactors[options.quality];
  let targetBitrate = Math.round(currentBitrate * factor);

  // Set reasonable bounds with lower minimum for better differentiation
  const minBitrate = 48;  // Allow lower bitrates for aggressive compression
  const maxBitrate = 256; // Don't exceed 256kbps

  // Only apply minimum if the calculated bitrate is reasonable
  if (targetBitrate < minBitrate && currentBitrate > minBitrate * 1.5) {
    console.log(`⚠️  Calculated bitrate (${targetBitrate}kbps) is very low, setting to minimum (${minBitrate}kbps)`);
    targetBitrate = minBitrate;
  }
  
  targetBitrate = Math.min(maxBitrate, targetBitrate);
  
  const originalCalculated = Math.round(currentBitrate * factor);

  const result = `${targetBitrate}k`;
  console.log(`🎯 Smart target bitrate: ${result} (${(factor * 100).toFixed(0)}% of original, calculated: ${originalCalculated}k → final: ${targetBitrate}k)`);
  
  return result;
}