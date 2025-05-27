
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
  const { toggleSidebar, open } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 relative",
        className
      )}
      onClick={toggleSidebar}
      {...props}
    >
      {open && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black rounded-r" />
      )}
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});

CustomSidebarTrigger.displayName = "CustomSidebarTrigger";

export default CustomSidebarTrigger;
