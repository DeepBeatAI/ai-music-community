/**
 * Creator Score Calculation Utility
 * 
 * Provides a consistent way to calculate creator scores across the application.
 * This ensures the score displayed on profile pages matches the score on discover pages.
 * 
 * FORMULA: (total_plays × 0.6) + (total_likes × 0.4)
 * 
 * This formula weights plays more heavily (60%) than likes (40%) to reflect
 * sustained engagement over one-time interactions.
 */

/**
 * Calculate creator score from plays and likes
 * 
 * @param totalPlays - Total number of plays across all public tracks
 * @param totalLikes - Total number of unique likes across all public tracks
 * @returns Creator score as a number (not rounded)
 * 
 * @example
 * const score = calculateCreatorScore(1000, 500);
 * // Returns: 800 (1000 * 0.6 + 500 * 0.4)
 * 
 * // Display with one decimal place
 * console.log(score.toFixed(1)); // "800.0"
 */
export function calculateCreatorScore(totalPlays: number, totalLikes: number): number {
  return (totalPlays * 0.6) + (totalLikes * 0.4);
}

/**
 * Format creator score for display
 * 
 * @param score - The creator score to format
 * @returns Formatted string with one decimal place
 * 
 * @example
 * formatCreatorScore(1234.5678); // "1234.6"
 * formatCreatorScore(100); // "100.0"
 */
export function formatCreatorScore(score: number): string {
  return score.toFixed(1);
}
