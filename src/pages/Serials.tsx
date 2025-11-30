import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Pencil, Barcode, Image as ImageIcon } from "lucide-react";
import { useSerials, useUpdateSerial, ProductSerial } from "@/hooks/useSerials";
import { useLocations } from "@/hooks/useMasterData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Serials() {
  const [search, setSearch] = useState("");
  const { data: serials, isLoading } = useSerials(search || undefined);
  const { data: locations } = useLocations();
  const updateSerial = useUpdateSerial();
  
  const [selectedSerial, setSelectedSerial] = useState<ProductSerial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '' as 'Ready' | 'Borrowed' | 'Repair' | 'Missing' | '',
    sticker_status: '' as 'Pending' | 'Done' | '',
    sticker_date: '',
    sticker_image_url: '',
    location_id: '',
  });

  const openEditDialog = (serial: ProductSerial) => {
    setSelectedSerial(serial);
    setEditForm({
      status: serial.status,
      sticker_status: serial.sticker_status,
      sticker_date: serial.sticker_date || '',
      sticker_image_url: serial.sticker_image_url || '',
      location_id: serial.location_id || '',
    });
    setIsDialogOpen(true);
  };

  const handleStickerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `sticker_${Date.now()}.${fileExt}`;
      const filePath = `stickers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('asset-images')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, sticker_image_url: publicUrl }));
      toast.success('อัปโหลดรูปสติกเกอร์สำเร็จ');
    } catch (error) {
      toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSerial) return;

    // Validate sticker update
    if (editForm.sticker_status === 'Done' && !editForm.sticker_date) {
      toast.error('กรุณาระบุวันที่ติดสติกเกอร์');
      return;
    }

    await updateSerial.mutateAsync({
      id: selectedSerial.id,
      status: editForm.status as 'Ready' | 'Borrowed' | 'Repair' | 'Missing',
      sticker_status: editForm.sticker_status as 'Pending' | 'Done',
      sticker_date: editForm.sticker_date || null,
      sticker_image_url: editForm.sticker_image_url || null,
      location_id: editForm.location_id || null,
    });

    setIsDialogOpen(false);
    setSelectedSerial(null);
  };

  return (
    <MainLayout title="ติดตามรายการ (Serial)">
      <div className="space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยรหัสซีเรียลหรือชื่อสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : serials && serials.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสซีเรียล</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>สติกเกอร์</TableHead>
                    <TableHead>สถานที่</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serials.map((serial) => (
                    <TableRow key={serial.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {serial.serial_code}
                      </TableCell>
                      <TableCell>{serial.products?.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {serial.products?.category}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={serial.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={serial.sticker_status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {serial.locations ? (
                          <span>
                            {serial.locations.name}
                            {serial.locations.building && (
                              <span className="text-xs"> ({serial.locations.building})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(serial)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Barcode className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการในระบบ'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลรายการ</DialogTitle>
          </DialogHeader>
          {selectedSerial && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-mono text-sm font-medium">{selectedSerial.serial_code}</p>
                <p className="text-sm text-muted-foreground">{selectedSerial.products?.name}</p>
              </div>

              <div className="space-y-2">
                <Label>สถานะ</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ready">พร้อมใช้งาน</SelectItem>
                    <SelectItem value="Borrowed">ถูกยืม</SelectItem>
                    <SelectItem value="Repair">ซ่อมบำรุง</SelectItem>
                    <SelectItem value="Missing">สูญหาย</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>สถานที่</Label>
                <Select
                  value={editForm.location_id}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, location_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานที่" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.building && `(${loc.building})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>สถานะสติกเกอร์</Label>
                <Select
                  value={editForm.sticker_status}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, sticker_status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="Done">เสร็จสิ้น</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.sticker_status === 'Done' && (
                <>
                  <div className="space-y-2">
                    <Label>วันที่ติดสติกเกอร์</Label>
                    <Input
                      type="date"
                      value={editForm.sticker_date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sticker_date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>รูปสติกเกอร์</Label>
                    <div className="flex items-center gap-4">
                      {editForm.sticker_image_url ? (
                        <img
                          src={editForm.sticker_image_url}
                          alt="Sticker"
                          className="h-16 w-16 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleStickerImageUpload}
                        disabled={isUploading}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdate} disabled={updateSerial.isPending}>
                  {updateSerial.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
