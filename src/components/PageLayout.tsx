
import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PageLayout = ({ 
  children, 
  className = '',
  maxWidth = 'full',
  padding = 'lg'
}: PageLayoutProps) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-none'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-x-hidden">
      <div className={`flex-1 ${paddingClasses[padding]} ${className} overflow-x-hidden`}>
        <div className={`${maxWidthClasses[maxWidth]} h-full w-full`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
