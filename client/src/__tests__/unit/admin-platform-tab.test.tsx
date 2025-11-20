/**
 * Platform Administration Tab Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformAdminTab } from '@/components/admin/PlatformAdminTab';
import * as platformConfigService from '@/lib/platformConfigService';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
  },
}));

jest.mock('@/lib/platformConfigService');

const mockConfigs = [
  {
    id: '1',
    config_key: 'feature_new_player',
    config_value: { enabled: true },
    config_type: 'feature_flag' as const,
    description: 'Enable new audio player',
    is_active: true,
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    config_key: 'upload_limit_free',
    config_value: { max_size_mb: 50, max_files_per_month: 10 },
    config_type: 'upload_limit' as const,
    description: 'Upload limits for free tier',
    is_active: true,
    updated_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('PlatformAdminTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.alert
    global.alert = jest.fn();
    (platformConfigService.fetchPlatformConfig as jest.Mock).mockResolvedValue(mockConfigs);
  });

  it('should render loading state initially', () => {
    render(<PlatformAdminTab />);
    expect(screen.getByText('Loading platform configuration...')).toBeInTheDocument();
  });

  it('should render feature flags section', async () => {
    render(<PlatformAdminTab />);

    await waitFor(() => {
      expect(screen.getByText('Feature Flags')).toBeInTheDocument();
      expect(screen.getByText('feature_new_player')).toBeInTheDocument();
    });
  });

  it('should render upload limits section', async () => {
    render(<PlatformAdminTab />);

    await waitFor(() => {
      expect(screen.getByText('Upload Limits by Plan Tier')).toBeInTheDocument();
      expect(screen.getByText('upload_limit_free')).toBeInTheDocument();
    });
  });

  it('should toggle feature flag', async () => {
    const user = userEvent.setup();
    (platformConfigService.updateFeatureFlag as jest.Mock).mockResolvedValue(undefined);

    render(<PlatformAdminTab />);

    await waitFor(() => {
      expect(screen.getByText('feature_new_player')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    await waitFor(() => {
      expect(platformConfigService.updateFeatureFlag).toHaveBeenCalledWith(
        'feature_new_player',
        false
      );
    });
  });

  it('should allow editing config values', async () => {
    const user = userEvent.setup();
    (platformConfigService.updatePlatformConfig as jest.Mock).mockResolvedValue(undefined);

    render(<PlatformAdminTab />);

    await waitFor(() => {
      expect(screen.getByText('upload_limit_free')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    // Use paste instead of type to avoid issues with special characters
    await user.click(textarea);
    await user.paste('{"max_size_mb": 100}');

    const saveButton = screen.getByRole('button', { name: /Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(platformConfigService.updatePlatformConfig).toHaveBeenCalled();
    });
  });

  it('should show error on fetch failure', async () => {
    (platformConfigService.fetchPlatformConfig as jest.Mock).mockRejectedValue(
      new Error('Failed to load')
    );

    render(<PlatformAdminTab />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });
});
