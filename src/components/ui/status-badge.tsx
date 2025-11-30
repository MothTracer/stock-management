import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 'Ready' | 'Borrowed' | 'Repair' | 'Missing' | 'Pending' | 'Done' | 'Active' | 'Completed';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
  Ready: { label: 'พร้อมใช้งาน', variant: 'success' },
  Done: { label: 'เสร็จสิ้น', variant: 'success' },
  Completed: { label: 'คืนแล้ว', variant: 'success' },
  Borrowed: { label: 'ถูกยืม', variant: 'warning' },
  Pending: { label: 'รอดำเนินการ', variant: 'warning' },
  Active: { label: 'กำลังยืม', variant: 'warning' },
  Repair: { label: 'ซ่อมบำรุง', variant: 'destructive' },
  Missing: { label: 'สูญหาย', variant: 'destructive' },
};

const variantStyles = {
  success: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  default: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium border",
        variantStyles[config.variant],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
