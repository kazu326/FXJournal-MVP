"use client";

import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface NextActionCardProps {
  pendingCount?: number;
  actionLabel?: string;
  onAction?: () => void;
  description?: string;
}

export function NextActionCard({
  pendingCount = 1,
  actionLabel = "取引後 (60秒)",
  onAction,
  description,
}: NextActionCardProps) {
  return (
    <Card className="relative overflow-hidden border-l-4 border-l-primary">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="size-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">次にやること</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed mb-4">
          {description ?? `未完が${pendingCount}件あります。完了すると記録が締まります。`}
        </p>
        <Button className="w-full h-12 text-base font-medium" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
