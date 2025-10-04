'use client';

import { useState } from 'react';

interface CreatorFilterButtonProps {
  creatorId: string;
  creatorUsername: string;
  onFilterByCreator: (creatorId: string, username: string) => void;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export default function CreatorFilterButton({
  creatorId,
  creatorUsername,
  onFilterByCreator,
  isActive = false,
  size = 'sm',
  variant = 'secondary',
  className = ''
}: CreatorFilterButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onFilterByCreator(creatorId, creatorUsername);
    } catch (error) {
      console.error('Error filtering by creator:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses = {
    primary: isActive 
      ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700 shadow-md shadow-blue-500/30'
      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: isActive
      ? 'border-blue-400 text-blue-200 bg-blue-900/50 hover:bg-blue-900/70 shadow-md shadow-blue-500/20'
      : 'border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500'
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        flex items-center space-x-2 border rounded-md font-medium transition-all duration-200 
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={isActive ? `Currently viewing posts by ${creatorUsername}` : `See posts from ${creatorUsername}`}
    >
      <span className="text-sm">
        {isActive ? '👁️' : '🔍'}
      </span>
      <span>
        {isActive ? 'Currently viewing' : 'See posts'}
      </span>
      {isLoading && (
        <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
      )}
    </button>
  );
}