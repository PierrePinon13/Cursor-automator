
import { ReactNode } from 'react';
import CustomSidebarTrigger from '@/components/ui/CustomSidebarTrigger';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Bell, Plus } from 'lucide-react';

interface GlobalPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: ReactNode;
}

const GlobalPageHeader = ({ 
  title, 
  subtitle, 
  icon, 
  breadcrumbs,
  actions 
}: GlobalPageHeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CustomSidebarTrigger />
          
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-blue-50 rounded-lg">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              </div>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumb className="mt-2">
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center">
                        <BreadcrumbItem>
                          {crumb.href ? (
                            <BreadcrumbLink href={crumb.href} className="text-gray-500 hover:text-gray-700">
                              {crumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage className="text-gray-900 font-medium">
                              {crumb.label}
                            </BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                        {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            </span>
          </Button>
          {actions}
        </div>
      </div>
    </header>
  );
};

export default GlobalPageHeader;
