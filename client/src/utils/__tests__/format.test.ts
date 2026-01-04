import { parseTimestamps, parseTimestampToSeconds } from '../format';

describe('parseTimestamps', () => {
  it('should parse multiple timestamps separated by commas', () => {
    const result = parseTimestamps('2:35, 5:12, 8:45');
    expect(result).toEqual(['2:35', '5:12', '8:45']);
  });

  it('should parse a single timestamp', () => {
    const result = parseTimestamps('2:35');
    expect(result).toEqual(['2:35']);
  });

  it('should trim whitespace from timestamps', () => {
    const result = parseTimestamps('  2:35  ,  5:12  ,  8:45  ');
    expect(result).toEqual(['2:35', '5:12', '8:45']);
  });

  it('should filter out empty strings', () => {
    const result = parseTimestamps('2:35, , 5:12, ,8:45');
    expect(result).toEqual(['2:35', '5:12', '8:45']);
  });

  it('should return empty array for empty string', () => {
    const result = parseTimestamps('');
    expect(result).toEqual([]);
  });

  it('should return empty array for null', () => {
    const result = parseTimestamps(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    const result = parseTimestamps(undefined);
    expect(result).toEqual([]);
  });

  it('should handle timestamps with different formats', () => {
    const result = parseTimestamps('2:35, 1:23:45, 10:00');
    expect(result).toEqual(['2:35', '1:23:45', '10:00']);
  });

  it('should handle trailing comma', () => {
    const result = parseTimestamps('2:35, 5:12,');
    expect(result).toEqual(['2:35', '5:12']);
  });

  it('should handle leading comma', () => {
    const result = parseTimestamps(',2:35, 5:12');
    expect(result).toEqual(['2:35', '5:12']);
  });
});

describe('parseTimestampToSeconds', () => {
  describe('MM:SS format', () => {
    it('should convert MM:SS format to seconds', () => {
      expect(parseTimestampToSeconds('2:35')).toBe(155); // 2*60 + 35
    });

    it('should handle single digit minutes', () => {
      expect(parseTimestampToSeconds('5:12')).toBe(312); // 5*60 + 12
    });

    it('should handle zero minutes', () => {
      expect(parseTimestampToSeconds('0:30')).toBe(30);
    });

    it('should handle zero seconds', () => {
      expect(parseTimestampToSeconds('5:00')).toBe(300);
    });

    it('should handle double digit minutes', () => {
      expect(parseTimestampToSeconds('45:30')).toBe(2730); // 45*60 + 30
    });
  });

  describe('HH:MM:SS format', () => {
    it('should convert HH:MM:SS format to seconds', () => {
      expect(parseTimestampToSeconds('1:23:45')).toBe(5025); // 1*3600 + 23*60 + 45
    });

    it('should handle single digit hours', () => {
      expect(parseTimestampToSeconds('2:15:30')).toBe(8130); // 2*3600 + 15*60 + 30
    });

    it('should handle zero hours', () => {
      expect(parseTimestampToSeconds('0:10:30')).toBe(630); // 0*3600 + 10*60 + 30
    });

    it('should handle double digit hours', () => {
      expect(parseTimestampToSeconds('12:30:45')).toBe(45045); // 12*3600 + 30*60 + 45
    });

    it('should handle all zeros', () => {
      expect(parseTimestampToSeconds('0:00:00')).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for null', () => {
      expect(parseTimestampToSeconds(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(parseTimestampToSeconds(undefined)).toBe(0);
    });

    it('should return 0 for empty string', () => {
      expect(parseTimestampToSeconds('')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parseTimestampToSeconds('  2:35  ')).toBe(155);
    });

    it('should handle leading zeros', () => {
      expect(parseTimestampToSeconds('02:05')).toBe(125); // 2*60 + 5
      expect(parseTimestampToSeconds('01:02:03')).toBe(3723); // 1*3600 + 2*60 + 3
    });
  });

  describe('invalid formats', () => {
    it('should return 0 for invalid format with too few parts', () => {
      expect(parseTimestampToSeconds('123')).toBe(0);
    });

    it('should return 0 for invalid format with too many parts', () => {
      expect(parseTimestampToSeconds('1:2:3:4')).toBe(0);
    });

    it('should return 0 for non-numeric values', () => {
      expect(parseTimestampToSeconds('abc')).toBe(0);
      expect(parseTimestampToSeconds('2:abc')).toBe(0);
      expect(parseTimestampToSeconds('1:2:abc')).toBe(0);
    });

    it('should return 0 for negative values', () => {
      expect(parseTimestampToSeconds('-2:35')).toBe(0);
      expect(parseTimestampToSeconds('2:-35')).toBe(0);
      expect(parseTimestampToSeconds('-1:2:3')).toBe(0);
    });

    it('should return 0 for seconds >= 60', () => {
      expect(parseTimestampToSeconds('2:60')).toBe(0);
      expect(parseTimestampToSeconds('2:99')).toBe(0);
      expect(parseTimestampToSeconds('1:2:60')).toBe(0);
    });

    it('should return 0 for minutes >= 60 in HH:MM:SS format', () => {
      expect(parseTimestampToSeconds('1:60:30')).toBe(0);
      expect(parseTimestampToSeconds('1:99:30')).toBe(0);
    });

    it('should return 0 for decimal values', () => {
      expect(parseTimestampToSeconds('2.5:30')).toBe(0);
      expect(parseTimestampToSeconds('2:30.5')).toBe(0);
    });

    it('should return 0 for special characters', () => {
      expect(parseTimestampToSeconds('2:35!')).toBe(0);
      expect(parseTimestampToSeconds('2@35')).toBe(0);
    });
  });
});
