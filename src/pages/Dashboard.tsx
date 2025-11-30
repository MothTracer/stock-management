import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Package, ArrowLeftRight, Wrench } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useRecentTransactions } from "@/hooks/useTransactions";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentTransactions, isLoading: transactionsLoading } = useRecentTransactions(5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy', { locale: th });
  };

  return (
    <MainLayout title="แดชบอร์ด">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatCard
                title="มูลค่าทรัพย์สินรวม"
                value={formatCurrency(stats?.totalValue || 0)}
                icon={DollarSign}
                variant="primary"
              />
              <StatCard
                title="จำนวนรายการทั้งหมด"
                value={stats?.totalItems.toLocaleString() || '0'}
                icon={Package}
                variant="success"
              />
              <StatCard
                title="กำลังถูกยืม"
                value={stats?.borrowedCount.toLocaleString() || '0'}
                icon={ArrowLeftRight}
                variant="warning"
              />
              <StatCard
                title="อยู่ระหว่างซ่อม"
                value={stats?.repairCount.toLocaleString() || '0'}
                icon={Wrench}
                variant="destructive"
              />
            </>
          )}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">รายการเคลื่อนไหวล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransactions && recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสซีเรียล</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>ผู้ยืม</TableHead>
                    <TableHead>วันที่ยืม</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.product_serials?.serial_code}
                      </TableCell>
                      <TableCell>{tx.product_serials?.products?.name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{tx.employees?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {tx.employees?.emp_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(tx.borrow_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                ยังไม่มีรายการเคลื่อนไหว
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
