
import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { MoreHorizontal } from "lucide-react";

interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  actions?: React.ReactNode;
  hoverable?: boolean;
  selected?: boolean;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ 
    className, 
    title, 
    description, 
    icon, 
    badge, 
    badgeVariant = "default",
    actions,
    hoverable = false,
    selected = false,
    children, 
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "relative transition-all duration-200",
          hoverable && "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer",
          selected && "ring-2 ring-blue-500 border-blue-200",
          className
        )}
        {...props}
      >
        {(title || description || icon || badge || actions) && (
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                {icon && (
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {title && (
                      <CardTitle className="text-lg font-semibold truncate">
                        {title}
                      </CardTitle>
                    )}
                    {badge && (
                      <Badge variant={badgeVariant} className="text-xs">
                        {badge}
                      </Badge>
                    )}
                  </div>
                  {description && (
                    <CardDescription className="text-sm">
                      {description}
                    </CardDescription>
                  )}
                </div>
              </div>
              {actions && (
                <div className="flex items-center gap-1">
                  {actions}
                </div>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(title || description ? "pt-0" : "")}>
          {children}
        </CardContent>
      </Card>
    );
  }
);

EnhancedCard.displayName = "EnhancedCard";

export { EnhancedCard };
