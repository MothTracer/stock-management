import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup
import { SearchableSelect } from "@/components/ui/searchable-select"; // Import Component ใหม่
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { 
  useTransactions, 
  useCreateTransaction, 
  useReturnTransaction 
} from "@/hooks/useTransactions";
import { useAvailableSerials } from "@/hooks/useSerials";
import { useEmployees, useDepartments } from "@/hooks/useMasterData";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function Transactions() {
  const { data: activeTransactions, isLoading: activeLoading } = useTransactions('Active');
  const { data: completedTransactions, isLoading: completedLoading } = useTransactions('Completed');
  const { data: availableSerials } = useAvailableSerials();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments(); // ดึงข้อมูลแผนกมาด้วย
  
  const createTransaction = useCreateTransaction();
  const returnTransaction = useReturnTransaction();

  // State สำหรับประเภทผู้ยืม
  const [borrowerType, setBorrowerType] = useState<'employee' | 'department'>('employee');

  const [borrowForm, setBorrowForm] = useState({
    borrower_id: '', // ใช้ตัวแปรกลางๆ แทน employee_id
    serial_id: '',
    note: '',
  });

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NOTE: ระบบ Database ปัจจุบัน transactions ผูกกับ employee_id
    // หากเลือกเป็นแผนก คุณอาจจะต้องมี Logic แปลง Department ID เป็น Employee ID ตัวแทน หรือแก้ DB
    // ในที่นี้จะส่งค่าไปเป็น employee_id ตามปกติไปก่อน
    
    await createTransaction.mutateAsync({
      employee_id: borrowForm.borrower_id, 
      serial_id: borrowForm.serial_id,
      note: borrowForm.note || undefined,
    });

    setBorrowForm({ borrower_id: '', serial_id: '', note: '' });
  };

  const handleReturn = async (transactionId: string, serialId: string) => {
    await returnTransaction.mutateAsync({ transactionId, serialId });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMM yyyy HH:mm', { locale: th });
  };

  // เตรียมข้อมูลสำหรับ SearchableSelect
  const employeeOptions = employees?.map(emp => ({
    value: emp.id,
    label: `${emp.emp_code} - ${emp.name}`
  })) || [];

  const departmentOptions = departments?.map(dept => ({
    value: dept.id,
    label: dept.name // หมายเหตุ: ถ้าจะใช้จริงต้องแก้ DB ให้ Transaction รองรับ Department ID
  })) || [];

  const serialOptions = availableSerials?.map(serial => ({
    value: serial.id,
    label: `${serial.serial_code} : ${serial.products?.name}`
  })) || [];

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
                <form onSubmit={handleBorrow} className="space-y-6 max-w-lg">
                  
                  {/* เลือกประเภทผู้ยืม */}
                  <div className="space-y-3">
                    <Label>ประเภทผู้ยืม</Label>
                    <RadioGroup 
                      defaultValue="employee" 
                      value={borrowerType}
                      onValueChange={(val) => {
                        setBorrowerType(val as 'employee' | 'department');
                        setBorrowForm(prev => ({ ...prev, borrower_id: '' })); // Reset selection
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="employee" id="r-employee" />
                        <Label htmlFor="r-employee" className="cursor-pointer">พนักงานรายบุคคล</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="department" id="r-department" />
                        <Label htmlFor="r-department" className="cursor-pointer">เบิกเข้าแผนก</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* เลือกผู้เบิก (ค้นหาได้) */}
                  <div className="space-y-2">
                    <Label>{borrowerType === 'employee' ? 'ชื่อพนักงาน' : 'ชื่อแผนก'}</Label>
                    <SearchableSelect
                      items={borrowerType === 'employee' ? employeeOptions : departmentOptions}
                      value={borrowForm.borrower_id}
                      onValueChange={(value) => setBorrowForm(prev => ({ ...prev, borrower_id: value }))}
                      placeholder={borrowerType === 'employee' ? "ค้นหาพนักงาน..." : "ค้นหาแผนก..."}
                      emptyMessage="ไม่พบข้อมูล"
                    />
                    {borrowerType === 'department' && (
                      <p className="text-xs text-yellow-600">
                        * หมายเหตุ: ระบบปัจจุบันจำเป็นต้องระบุตัวแทนรับของ หรือแก้ฐานข้อมูลให้รองรับแผนก
                      </p>
                    )}
                  </div>

                  {/* เลือกรายการ (ค้นหาได้) */}
                  <div className="space-y-2">
                    <Label>รายการที่ต้องการเบิก (ค้นหาด้วย Serial หรือ ชื่อ)</Label>
                    <SearchableSelect
                      items={serialOptions}
                      value={borrowForm.serial_id}
                      onValueChange={(value) => setBorrowForm(prev => ({ ...prev, serial_id: value }))}
                      placeholder="ค้นหารหัส Serial หรือชื่อสินค้า..."
                      emptyMessage="ไม่พบรายการที่พร้อมใช้งาน"
                    />
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
                    disabled={!borrowForm.borrower_id || !borrowForm.serial_id || createTransaction.isPending}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    {createTransaction.isPending ? 'กำลังบันทึก...' : 'บันทึกการเบิก'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ... (Tab Active และ History ใช้ Code เดิมได้เลยครับ) ... */}
          <TabsContent value="active">
             {/* Copy เนื้อหาเดิมจากไฟล์ Transactions.tsx ส่วน Active Tab มาวางที่นี่ */}
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

          <TabsContent value="history">
             {/* Copy เนื้อหาเดิมจากไฟล์ Transactions.tsx ส่วน History Tab มาวางที่นี่ */}
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