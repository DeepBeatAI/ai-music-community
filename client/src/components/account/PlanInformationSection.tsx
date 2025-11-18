'use client'

import UserTypeBadge from '@/components/profile/UserTypeBadge';
import { 
  PlanTier, 
  RoleType, 
  PLAN_TIER_DISPLAY_NAMES, 
  PLAN_TIER_DESCRIPTIONS 
} from '@/types/userTypes';

interface PlanInformationSectionProps {
  planTier: PlanTier;
  roles: RoleType[];
  onChangePlan?: () => void;
}

/**
 * PlanInformationSection Component
 * 
 * Displays user's current plan tier information on the account page.
 * Shows plan name, description, badges, and a "Change Plan" button.
 * 
 * Features:
 * - Displays current plan tier name
 * - Shows plan tier description
 * - Displays all user badges (plan tier + roles)
 * - "Change Plan" placeholder button for future functionality
 * - Responsive design for mobile/tablet/desktop
 * - Styled to match account page design
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export default function PlanInformationSection({
  planTier,
  roles,
  onChangePlan
}: PlanInformationSectionProps) {
  const planName = PLAN_TIER_DISPLAY_NAMES[planTier];
  const planDescription = PLAN_TIER_DESCRIPTIONS[planTier];
  const isAdmin = roles.includes(RoleType.ADMIN);

  const handleChangePlan = () => {
    if (onChangePlan) {
      onChangePlan();
    } else {
      // Placeholder: Show coming soon message
      alert('Plan management coming soon! You will be able to upgrade or change your plan here.');
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Plan & Subscription
      </h2>

      <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
        {/* Current Plan Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Current Plan
          </label>
          <h3 className="text-2xl font-bold text-white mb-3">
            {planName}
          </h3>
        </div>

        {/* Badges */}
        <div className="mb-4">
          <UserTypeBadge 
            planTier={planTier}
            roles={isAdmin ? roles.filter(r => r === RoleType.ADMIN) : roles}
            size="md"
            showPlanTier={!isAdmin}
          />
        </div>

        {/* Plan Description */}
        <div className="mb-6">
          <p className="text-gray-300 text-sm leading-relaxed">
            {planDescription}
          </p>
        </div>

        {/* Change Plan Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleChangePlan}
            className="
              px-6 py-3 
              bg-blue-600 hover:bg-blue-700 
              text-white font-medium rounded-lg
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
              w-full sm:w-auto
            "
            aria-label="Change subscription plan"
          >
            Change Plan →
          </button>
          
          {/* Additional info for mobile */}
          <div className="sm:hidden text-xs text-gray-400 text-center">
            Manage your subscription and billing
          </div>
        </div>

        {/* Desktop additional info */}
        <div className="hidden sm:block mt-4 pt-4 border-t border-gray-600">
          <p className="text-xs text-gray-400">
            Need help choosing a plan? Contact our support team for personalized recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
