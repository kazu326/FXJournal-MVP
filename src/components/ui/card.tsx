import * as React from "react";
import { cn } from "../../lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

/* 渡された className（例: !bg-transparent glass-panel）がデフォルトを上書きできるよう、第2引数に className を渡す */
const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full rounded-2xl border border-border bg-card text-card-foreground shadow-md", className)}
    {...props}
  />
));
Card.displayName = "Card";

const GlassCard = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-full rounded-2xl glass-panel backdrop-blur-xl",
      className
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

const CardContent = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("card-content p-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, GlassCard, CardContent };
