import { render, screen, fireEvent } from '@testing-library/react';
import { ReportCard } from '../ReportCard';
import { Report } from '@/types/moderation';

const mockReport: Report = {
  id: 'report-123',
  reporter_id: 'user-456',
  reported_user_id: 'user-789',
  report_type: 'post',
  target_id: 'post-abc',
  reason: 'spam',
  description: 'This is a spam post',
  status: 'pending',
  priority: 3,
  moderator_flagged: false,
  reviewed_by: null,
  reviewed_at: null,
  resolution_notes: null,
  action_taken: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockModeratorFlaggedReport: Report = {
  ...mockReport,
  id: 'report-456',
  moderator_flagged: true,
  status: 'under_review',
  priority: 2,
  reason: 'hate_speech',
};

const mockResolvedReport: Report = {
  ...mockReport,
  id: 'report-789',
  status: 'resolved',
  reviewed_by: 'mod-123',
  reviewed_at: new Date().toISOString(),
  resolution_notes: 'Content removed and user warned',
  action_taken: 'content_removed',
};

describe('ReportCard', () => {
  describe('Rendering', () => {
    it('should render report card with basic information', () => {
      const onSelect = jest.fn();
      const { container } = render(<ReportCard report={mockReport} onSelect={onSelect} />);

      expect(screen.getByText('P3 - Standard')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      // Check for the report type specifically (it's capitalized with CSS)
      const reportType = container.querySelector('.capitalize');
      expect(reportType).toHaveTextContent('post');
      expect(screen.getByText('Spam or Misleading Content')).toBeInTheDocument();
    });

    it('should display moderator flag badge for moderator-flagged reports', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockModeratorFlaggedReport} onSelect={onSelect} />);

      expect(screen.getByText(/Moderator Flag/)).toBeInTheDocument();
    });

    it('should not display moderator flag badge for user reports', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      expect(screen.queryByText(/Moderator Flag/)).not.toBeInTheDocument();
    });

    it('should display description when present', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      expect(screen.getByText('This is a spam post')).toBeInTheDocument();
    });

    it('should not display description section when description is null', () => {
      const reportWithoutDescription = { ...mockReport, description: null };
      const onSelect = jest.fn();
      render(<ReportCard report={reportWithoutDescription} onSelect={onSelect} />);

      expect(screen.queryByText('Description:')).not.toBeInTheDocument();
    });

    it('should display resolution notes for resolved reports', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockResolvedReport} onSelect={onSelect} />);

      expect(screen.getByText('Resolution Notes:')).toBeInTheDocument();
      expect(screen.getByText('Content removed and user warned')).toBeInTheDocument();
    });

    it('should display reviewer information for reviewed reports', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockResolvedReport} onSelect={onSelect} />);

      expect(screen.getByText(/Reviewed by:/)).toBeInTheDocument();
    });

    it('should display action buttons when showActions is true', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} showActions={true} />);

      expect(screen.getByText('Review Report →')).toBeInTheDocument();
    });

    it('should not display action buttons when showActions is false', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} showActions={false} />);

      expect(screen.queryByText('Review Report →')).not.toBeInTheDocument();
    });
  });

  describe('Priority Badges', () => {
    it('should display P1 - Critical badge with red color', () => {
      const criticalReport = { ...mockReport, priority: 1 };
      const onSelect = jest.fn();
      render(<ReportCard report={criticalReport} onSelect={onSelect} />);

      const badge = screen.getByText('P1 - Critical');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should display P2 - High badge with orange color', () => {
      const highReport = { ...mockReport, priority: 2 };
      const onSelect = jest.fn();
      render(<ReportCard report={highReport} onSelect={onSelect} />);

      const badge = screen.getByText('P2 - High');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-orange-500');
    });

    it('should display P3 - Standard badge with yellow color', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      const badge = screen.getByText('P3 - Standard');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-500');
    });

    it('should display P4 - Low badge with blue color', () => {
      const lowReport = { ...mockReport, priority: 4 };
      const onSelect = jest.fn();
      render(<ReportCard report={lowReport} onSelect={onSelect} />);

      const badge = screen.getByText('P4 - Low');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('should display P5 - Minimal badge with gray color', () => {
      const minimalReport = { ...mockReport, priority: 5 };
      const onSelect = jest.fn();
      render(<ReportCard report={minimalReport} onSelect={onSelect} />);

      const badge = screen.getByText('P5 - Minimal');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-500');
    });
  });

  describe('Status Badges', () => {
    it('should display Pending status with yellow color', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      const badge = screen.getByText('Pending');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-500');
    });

    it('should display Under Review status with blue color', () => {
      const underReviewReport = { ...mockReport, status: 'under_review' as const };
      const onSelect = jest.fn();
      render(<ReportCard report={underReviewReport} onSelect={onSelect} />);

      const badge = screen.getByText('Under Review');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('should display Resolved status with green color', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockResolvedReport} onSelect={onSelect} />);

      const badge = screen.getByText('Resolved');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-500');
    });

    it('should display Dismissed status with gray color', () => {
      const dismissedReport = { ...mockReport, status: 'dismissed' as const };
      const onSelect = jest.fn();
      render(<ReportCard report={dismissedReport} onSelect={onSelect} />);

      const badge = screen.getByText('Dismissed');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-gray-500');
    });
  });

  describe('Report Type Icons', () => {
    it('should display post icon for post reports', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should display comment icon for comment reports', () => {
      const commentReport = { ...mockReport, report_type: 'comment' as const };
      const onSelect = jest.fn();
      render(<ReportCard report={commentReport} onSelect={onSelect} />);

      expect(screen.getByText('💬')).toBeInTheDocument();
    });

    it('should display track icon for track reports', () => {
      const trackReport = { ...mockReport, report_type: 'track' as const };
      const onSelect = jest.fn();
      render(<ReportCard report={trackReport} onSelect={onSelect} />);

      expect(screen.getByText('🎵')).toBeInTheDocument();
    });

    it('should display user icon for user reports', () => {
      const userReport = { ...mockReport, report_type: 'user' as const };
      const onSelect = jest.fn();
      render(<ReportCard report={userReport} onSelect={onSelect} />);

      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when card is clicked', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} />);

      const card = screen.getByText('P3 - Standard').closest('div');
      if (card) {
        fireEvent.click(card);
      }

      expect(onSelect).toHaveBeenCalled();
    });

    it('should call onSelect when Review button is clicked', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} showActions={true} />);

      const reviewButton = screen.getByText('Review Report →');
      fireEvent.click(reviewButton);

      expect(onSelect).toHaveBeenCalled();
    });

    it('should stop propagation when Review button is clicked', () => {
      const onSelect = jest.fn();
      render(<ReportCard report={mockReport} onSelect={onSelect} showActions={true} />);

      const reviewButton = screen.getByText('Review Report →');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

      fireEvent.click(reviewButton);

      // onSelect should still be called once
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Date Formatting', () => {
    it('should display relative time for recent reports', () => {
      const recentReport = {
        ...mockReport,
        created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
      };
      const onSelect = jest.fn();
      render(<ReportCard report={recentReport} onSelect={onSelect} />);

      expect(screen.getByText(/30 minutes ago/)).toBeInTheDocument();
    });

    it('should display hours for reports from today', () => {
      const todayReport = {
        ...mockReport,
        created_at: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
      };
      const onSelect = jest.fn();
      render(<ReportCard report={todayReport} onSelect={onSelect} />);

      expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    });

    it('should display days for reports from this week', () => {
      const weekReport = {
        ...mockReport,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      };
      const onSelect = jest.fn();
      render(<ReportCard report={weekReport} onSelect={onSelect} />);

      expect(screen.getByText(/2 days ago/)).toBeInTheDocument();
    });

    it('should display full date for older reports', () => {
      const oldReport = {
        ...mockReport,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago
      };
      const onSelect = jest.fn();
      render(<ReportCard report={oldReport} onSelect={onSelect} />);

      // Should display formatted date instead of relative time
      const dateElement = screen.getByText(/\d{1,2}:\d{2}/); // Matches time format
      expect(dateElement).toBeInTheDocument();
    });
  });
});
