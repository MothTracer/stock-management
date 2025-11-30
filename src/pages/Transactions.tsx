import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { 
  useTransactions, 
  useCreateTransaction, 
  useReturnTransaction 
} from "@/hooks/useTransactions";
import { useAvailableSerials } from "@/hooks/useSerials";
import { useEmployees } from "@/hooks/useMasterData";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function Transactions() {
  const { data: activeTransactions, isLoading: activeLoading } = useTransactions('Active');
  const { data: completedTransactions, isLoading: completedLoading } = useTransactions('Completed');
  const { data: availableSerials } = useAvailableSerials();
  const { data: employees } = useEmployees();
  
  const createTransaction = useCreateTransaction();
  const returnTransaction = useReturnTransaction();

  const [borrowForm, setBorrowForm] = useState({
    employee_id: '',
    serial_id: '',
    note: '',
  });

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createTransaction.mutateAsync({
      employee_id: borrowForm.employee_id,
      serial_id: borrowForm.serial_id,
      note: borrowForm.note || undefined,
    });

    setBorrowForm({ employee_id: '', serial_id: '', note: '' });
  };

  const handleReturn = async (transactionId: string, serialId: string) => {
    await returnTransaction.mutateAsync({ transactionId, serialId });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy HH:mm', { locale: th });
  };

  return (
    <MainLayout title="เบิก-คืน ทรัพย์สิน">
      <div className="space-y-6">
        <Tabs defaultValue="borrow" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="borrow">เบิกใหม่</TabsTrigger>
            <TabsTrigger value="active">กำลังยืม</TabsTrigger>
            <TabsTrigger value="history">ประวัติ</TabsTrigger>
          </TabsList>

          {/* Borrow Tab */}
          <TabsContent value="borrow">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">บันทึกการเบิกทรัพย์สิน</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBorrow} className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label>ผู้เบิก</Label>
                    <Select
                      value={borrowForm.employee_id}
                      onValueChange={(value) => setBorrowForm(prev => ({ ...prev, employee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกพนักงาน" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.emp_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>รายการที่ต้องการเบิก</Label>
                    <Select
                      value={borrowForm.serial_id}
                      onValueChange={(value) => setBorrowForm(prev => ({ ...prev, serial_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกรายการ (เฉพาะที่พร้อมใช้งาน)" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSerials?.map((serial) => (
                          <SelectItem key={serial.id} value={serial.id}>
                            {serial.serial_code} - {serial.products?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>หมายเหตุ (ถ้ามี)</Label>
                    <Textarea
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                      value={borrowForm.note}
                      onChange={(e) => setBorrowForm(prev => ({ ...prev, note: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={!borrowForm.employee_id || !borrowForm.serial_id || createTransaction.isPending}
                    className="gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    {createTransaction.isPending ? 'กำลังบันทึก...' : 'บันทึกการเบิก'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Tab */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">รายการที่กำลังถูกยืม</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activeLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : activeTransactions && activeTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสซีเรียล</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead>ผู้ยืม</TableHead>
                        <TableHead>วันที่ยืม</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeTransactions.map((tx) => (
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
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(tx.borrow_date)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {tx.note || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleReturn(tx.id, tx.serial_id)}
                              disabled={returnTransaction.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                              คืน
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <ArrowLeftRight className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">ไม่มีรายการที่กำลังถูกยืม</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ประวัติการเบิก-คืน</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {completedLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : completedTransactions && completedTransactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รหัสซีเรียล</TableHead>
                        <TableHead>ชื่อสินค้า</TableHead>
                        <TableHead>ผู้ยืม</TableHead>
                        <TableHead>วันที่ยืม</TableHead>
                        <TableHead>วันที่คืน</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTransactions.map((tx) => (
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
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(tx.borrow_date)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {tx.return_date ? formatDate(tx.return_date) : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={tx.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <ArrowLeftRight className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">ยังไม่มีประวัติการเบิก-คืน</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
