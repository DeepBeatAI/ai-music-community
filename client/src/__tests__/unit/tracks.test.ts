/**
 * Unit Tests for Track Management Functions
 * 
 * Tests the track management API functions including:
 * - uploadTrack with valid and invalid data
 * - getTrack retrieval
 * - getUserTracks with filtering
 * - updateTrack metadata updates
 * - deleteTrack removal
 * - Error handling scenarios
 * 
 * Requirements: 4.4, 7.3, 9.1, 9.4
 */

import {
  uploadTrack,
  getTrack,
  getUserTracks,
  updateTrack,
  deleteTrack,
} from '@/lib/tracks';
import { supabase } from '@/lib/supabase';
import type { Track, TrackUploadData } from '@/types/track';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock compression utilities
jest.mock('@/utils/serverAudioCompression', () => ({
  serverAudioCompressor: {
    compressAudio: jest.fn(),
    getRecommendedSettings: jest.fn(),
  },
}));

jest.mock('@/utils/compressionAnalytics', () => ({
  compressionAnalytics: {
    trackCompression: jest.fn(),
  },
}));

describe('Track Management Functions', () => {
  const mockUserId = 'test-user-id';
  const mockTrackId = 'test-track-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadTrack', () => {
    const createMockFile = (size: number, type: string, name: string = 'test.mp3'): File => {
      const content = 'x'.repeat(size);
      return new File([content], name, { type });
    };

    const validUploadData: TrackUploadData = {
      file: createMockFile(1024 * 1024, 'audio/mpeg', 'test.mp3'), // 1MB
      title: 'Test Track',
      author: 'Test Artist',
      description: 'Test Description',
      is_public: true,
    };

    it('should upload track successfully with valid data', async () => {
      // Mock storage upload
      const mockStorageFrom = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.mp3' },
        }),
      });
      (supabase.storage.from as jest.Mock) = mockStorageFrom;

      // Mock database insert
      const mockTrack: Track = {
        id: mockTrackId,
        user_id: mockUserId,
        title: 'Test Track',
        author: 'Test Artist',
        description: 'Test Description',
        file_url: 'https://example.com/test.mp3',
        file_size: 1024 * 1024,
        mime_type: 'audio/mpeg',
        genre: null,
        tags: null,
        is_public: true,
        play_count: 0,
        duration: null,
        compression_applied: null,
        compression_ratio: null,
        original_file_size: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrack,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = await uploadTrack(mockUserId, validUploadData);

      expect(result.success).toBe(true);
      expect(result.track).toBeDefined();
      expect(result.track?.title).toBe('Test Track');
      expect(result.track?.user_id).toBe(mockUserId);
      expect(result.error).toBeUndefined();
    });

    it('should reject files over 50MB', async () => {
      const largeFile = createMockFile(51 * 1024 * 1024, 'audio/mpeg'); // 51MB
      const uploadData: TrackUploadData = {
        ...validUploadData,
        file: largeFile,
      };

      const result = await uploadTrack(mockUserId, uploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('50MB');
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
    });

    it('should reject invalid audio formats', async () => {
      const invalidFile = createMockFile(1024, 'text/plain', 'test.txt');
      const uploadData: TrackUploadData = {
        ...validUploadData,
        file: invalidFile,
      };

      const result = await uploadTrack(mockUserId, uploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid audio format');
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('should accept valid audio formats (MP3, WAV, FLAC)', async () => {
      const formats = [
        { type: 'audio/mpeg', name: 'test.mp3' },
        { type: 'audio/wav', name: 'test.wav' },
        { type: 'audio/flac', name: 'test.flac' },
        { type: 'audio/mp3', name: 'test.mp3' },
      ];

      for (const format of formats) {
        const file = createMockFile(1024, format.type, format.name);
        const uploadData: TrackUploadData = {
          ...validUploadData,
          file,
        };

        // Mock successful upload
        const mockStorageFrom = jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'test-path' },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/test.mp3' },
          }),
        });
        (supabase.storage.from as jest.Mock) = mockStorageFrom;

        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockTrackId },
                error: null,
              }),
            }),
          }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        const result = await uploadTrack(mockUserId, uploadData);

        // Should not fail on format validation
        if (!result.success && result.errorCode === 'INVALID_FORMAT') {
          fail(`Format ${format.type} should be valid but was rejected`);
        }
      }
    });

    it('should handle storage upload failure', async () => {
      const mockStorageFrom = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
      });
      (supabase.storage.from as jest.Mock) = mockStorageFrom;

      const result = await uploadTrack(mockUserId, validUploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('storage');
      expect(result.errorCode).toBe('STORAGE_FAILED');
    });

    it('should handle database insert failure', async () => {
      // Mock successful storage upload
      const mockStorageFrom = jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.mp3' },
        }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (supabase.storage.from as jest.Mock) = mockStorageFrom;

      // Mock database insert failure
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = await uploadTrack(mockUserId, validUploadData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('database');
      expect(result.errorCode).toBe('DATABASE_FAILED');
    });

    it('should retry storage upload on failure', async () => {
      let uploadAttempts = 0;
      const mockStorageFrom = jest.fn().mockReturnValue({
        upload: jest.fn().mockImplementation(() => {
          uploadAttempts++;
          if (uploadAttempts < 3) {
            return Promise.resolve({
              data: null,
              error: { message: 'Temporary error' },
            });
          }
          return Promise.resolve({
            data: { path: 'test-path' },
            error: null,
          });
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.mp3' },
        }),
      });
      (supabase.storage.from as jest.Mock) = mockStorageFrom;

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: mockTrackId },
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = await uploadTrack(mockUserId, validUploadData);

      expect(uploadAttempts).toBe(3);
      expect(result.success).toBe(true);
    });

    describe('Compression Integration', () => {
      // Import mocked modules
      const serverAudioCompressor = jest.requireMock('@/utils/serverAudioCompression').serverAudioCompressor;
      const compressionAnalytics = jest.requireMock('@/utils/compressionAnalytics').compressionAnalytics;

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should apply compression before upload', async () => {
        // Mock compression success
        const mockCompressionResult = {
          success: true,
          originalSize: 5 * 1024 * 1024, // 5MB
          compressedSize: 2 * 1024 * 1024, // 2MB
          compressionRatio: 2.5,
          duration: 180,
          bitrate: '128k',
          originalBitrate: '320k',
          supabaseUrl: 'https://example.com/compressed.mp3',
          compressionApplied: true,
        };

        serverAudioCompressor.getRecommendedSettings.mockReturnValue({
          quality: 'medium',
          targetBitrate: '128k',
        });
        serverAudioCompressor.compressAudio.mockResolvedValue(mockCompressionResult);

        // Mock database insert
        const mockTrack: Track = {
          id: mockTrackId,
          user_id: mockUserId,
          title: 'Test Track',
          author: 'Test Artist',
          description: 'Test Description',
          file_url: 'https://example.com/compressed.mp3',
          file_size: 2 * 1024 * 1024,
          original_file_size: 5 * 1024 * 1024,
          compression_ratio: 2.5,
          compression_applied: true,
          mime_type: 'audio/mpeg',
          genre: null,
          tags: null,
          is_public: true,
          play_count: 0,
          duration: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockTrack,
                error: null,
              }),
            }),
          }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        const result = await uploadTrack(mockUserId, validUploadData);

        expect(serverAudioCompressor.compressAudio).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.compressionInfo).toBeDefined();
        expect(result.compressionInfo?.compressionRatio).toBe(2.5);
        expect(result.compressionInfo?.compressionApplied).toBe(true);
      });

      it('should fallback to original file if compression fails', async () => {
        // Mock compression failure
        serverAudioCompressor.getRecommendedSettings.mockReturnValue({
          quality: 'medium',
        });
        serverAudioCompressor.compressAudio.mockResolvedValue({
          success: false,
          error: 'Compression failed',
          originalSize: 5 * 1024 * 1024,
          compressedSize: 0,
          compressionRatio: 0,
          duration: 0,
          bitrate: '',
        });

        // Mock storage upload
        const mockStorageFrom = jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'test-path' },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://example.com/test.mp3' },
          }),
        });
        (supabase.storage.from as jest.Mock) = mockStorageFrom;

        // Mock database insert
        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockTrackId, compression_applied: false },
                error: null,
              }),
            }),
          }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        const result = await uploadTrack(mockUserId, validUploadData);

        expect(result.success).toBe(true);
        expect(result.compressionInfo).toBeUndefined();
      });

      it('should store compression metadata in database', async () => {
        // Mock compression success
        const mockCompressionResult = {
          success: true,
          originalSize: 10 * 1024 * 1024,
          compressedSize: 3 * 1024 * 1024,
          compressionRatio: 3.33,
          duration: 240,
          bitrate: '96k',
          originalBitrate: '320k',
          supabaseUrl: 'https://example.com/compressed.mp3',
          compressionApplied: true,
        };

        serverAudioCompressor.getRecommendedSettings.mockReturnValue({
          quality: 'medium',
        });
        serverAudioCompressor.compressAudio.mockResolvedValue(mockCompressionResult);

        let insertedData: Record<string, unknown> = {};
        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockImplementation((data: Record<string, unknown>) => {
            insertedData = data;
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { ...data, id: mockTrackId },
                  error: null,
                }),
              }),
            };
          }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        await uploadTrack(mockUserId, validUploadData);

        expect(insertedData.original_file_size).toBe(10 * 1024 * 1024);
        expect(insertedData.compression_ratio).toBe(3.33);
        expect(insertedData.compression_applied).toBe(true);
        expect(insertedData.file_size).toBe(3 * 1024 * 1024);
      });

      it('should track compression analytics', async () => {
        // Mock compression success
        const mockCompressionResult = {
          success: true,
          originalSize: 8 * 1024 * 1024,
          compressedSize: 2 * 1024 * 1024,
          compressionRatio: 4.0,
          duration: 200,
          bitrate: '80k',
          originalBitrate: '320k',
          supabaseUrl: 'https://example.com/compressed.mp3',
          compressionApplied: true,
        };

        serverAudioCompressor.getRecommendedSettings.mockReturnValue({
          quality: 'low',
          targetBitrate: '80k',
        });
        serverAudioCompressor.compressAudio.mockResolvedValue(mockCompressionResult);

        const mockFrom = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: mockTrackId },
                error: null,
              }),
            }),
          }),
        });
        (supabase.from as jest.Mock) = mockFrom;

        await uploadTrack(mockUserId, validUploadData);

        expect(compressionAnalytics.trackCompression).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUserId,
            originalSize: 8 * 1024 * 1024,
            compressedSize: 2 * 1024 * 1024,
            compressionRatio: 4.0,
            compressionApplied: true,
          })
        );
      });
    });
  });

  describe('getTrack', () => {
    it('should fetch track by ID successfully', async () => {
      const mockTrack: Track = {
        id: mockTrackId,
        user_id: mockUserId,
        title: 'Test Track',
        author: 'Test Artist',
        description: 'Test Description',
        file_url: 'https://example.com/test.mp3',
        file_size: 1024 * 1024,
        mime_type: 'audio/mpeg',
        genre: null,
        tags: null,
        is_public: true,
        play_count: 0,
        duration: null,
        compression_applied: null,
        compression_ratio: null,
        original_file_size: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTrack,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const track = await getTrack(mockTrackId);

      expect(track).toBeDefined();
      expect(track?.id).toBe(mockTrackId);
      expect(track?.title).toBe('Test Track');
    });

    it('should return null for non-existent track', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const track = await getTrack('non-existent-id');

      expect(track).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const track = await getTrack(mockTrackId);

      expect(track).toBeNull();
    });
  });

  describe('getUserTracks', () => {
    const mockTracks: Track[] = [
      {
        id: 'track-1',
        user_id: mockUserId,
        title: 'Public Track 1',
        author: 'Test Artist',
        description: null,
        file_url: 'https://example.com/track1.mp3',
        file_size: 1024,
        mime_type: 'audio/mpeg',
        genre: null,
        tags: null,
        is_public: true,
        play_count: 0,
        duration: null,
        compression_applied: null,
        compression_ratio: null,
        original_file_size: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'track-2',
        user_id: mockUserId,
        title: 'Private Track',
        author: 'Test Artist',
        description: null,
        file_url: 'https://example.com/track2.mp3',
        file_size: 1024,
        mime_type: 'audio/mpeg',
        genre: null,
        tags: null,
        is_public: false,
        play_count: 0,
        duration: null,
        compression_applied: null,
        compression_ratio: null,
        original_file_size: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('should fetch public tracks only by default', async () => {
      const publicTracks = mockTracks.filter(t => t.is_public);

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: publicTracks,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const tracks = await getUserTracks(mockUserId);

      expect(tracks).toBeInstanceOf(Array);
      expect(tracks.length).toBe(1);
      expect(tracks.every(t => t.is_public)).toBe(true);
    });

    it('should fetch all tracks when includePrivate is true', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockTracks,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const tracks = await getUserTracks(mockUserId, true);

      expect(tracks).toBeInstanceOf(Array);
      expect(tracks.length).toBe(2);
    });

    it('should return empty array for user with no tracks', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const tracks = await getUserTracks('user-with-no-tracks');

      expect(tracks).toBeInstanceOf(Array);
      expect(tracks.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const tracks = await getUserTracks(mockUserId);

      expect(tracks).toBeInstanceOf(Array);
      expect(tracks.length).toBe(0);
    });
  });

  describe('updateTrack', () => {
    it('should update track metadata successfully', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
        is_public: false,
      };

      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await updateTrack(mockTrackId, updates);

      expect(success).toBe(true);
    });

    it('should handle update errors', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await updateTrack(mockTrackId, { title: 'New Title' });

      expect(success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await updateTrack(mockTrackId, { title: 'New Title' });

      expect(success).toBe(false);
    });
  });

  describe('deleteTrack', () => {
    it('should delete track successfully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await deleteTrack(mockTrackId);

      expect(success).toBe(true);
    });

    it('should handle delete errors', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Delete failed' },
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await deleteTrack(mockTrackId);

      expect(success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const success = await deleteTrack(mockTrackId);

      expect(success).toBe(false);
    });
  });
});
