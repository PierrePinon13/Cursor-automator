
import React from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface CustomSidebarTriggerProps {
  className?: string;
}

const CustomSidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  CustomSidebarTriggerProps
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});

CustomSidebarTrigger.displayName = "CustomSidebarTrigger";

export default CustomSidebarTrigger;
