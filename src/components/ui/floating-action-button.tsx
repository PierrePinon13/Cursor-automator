
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  size?: "sm" | "md" | "lg";
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ className, icon = <Plus className="h-5 w-5" />, position = "bottom-right", size = "md", ...props }, ref) => {
    const positionClasses = {
      "bottom-right": "bottom-6 right-6",
      "bottom-left": "bottom-6 left-6", 
      "top-right": "top-6 right-6",
      "top-left": "top-6 left-6"
    };

    const sizeClasses = {
      sm: "h-12 w-12",
      md: "h-14 w-14",
      lg: "h-16 w-16"
    };

    return (
      <Button
        ref={ref}
        className={cn(
          "fixed rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50",
          "bg-blue-600 hover:bg-blue-700 text-white",
          "hover:scale-105 active:scale-95",
          positionClasses[position],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

FloatingActionButton.displayName = "FloatingActionButton";

export { FloatingActionButton };
