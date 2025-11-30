import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Pencil, Barcode, Image as ImageIcon, Camera, MapPin } from "lucide-react";
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
  
  // Form State
  const [editForm, setEditForm] = useState({
    status: '',
    sticker_status: '',
    sticker_date: '',
    sticker_image_url: '',
    image_url: '', // รูปสินค้า
    notes: '',     // โน๊ต
    location_id: '',
  });

  const openEditDialog = (serial: ProductSerial) => {
    setSelectedSerial(serial);
    setEditForm({
      status: serial.status || 'พร้อมใช้',
      sticker_status: serial.sticker_status || 'รอติดสติ๊กเกอร์',
      sticker_date: serial.sticker_date || '',
      sticker_image_url: serial.sticker_image_url || '',
      image_url: serial.image_url || '',
      notes: serial.notes || '',
      location_id: serial.location_id || '',
    });
    setIsDialogOpen(true);
  };

  // ฟังก์ชันอัปโหลดรูป (ใช้ร่วมกันทั้งรูปสินค้าและสติกเกอร์)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'sticker_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${field}_${Date.now()}.${fileExt}`;
      const filePath = `serials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('asset-images')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, [field]: publicUrl }));
      toast.success('อัปโหลดรูปภาพสำเร็จ');
    } catch (error) {
      console.error(error);
      toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSerial) return;

    await updateSerial.mutateAsync({
      id: selectedSerial.id,
      status: editForm.status,
      sticker_status: editForm.sticker_status,
      sticker_date: editForm.sticker_date || null,
      sticker_image_url: editForm.sticker_image_url || null,
      image_url: editForm.image_url || null,
      notes: editForm.notes || null,
      location_id: editForm.location_id || null,
    });

    setIsDialogOpen(false);
    setSelectedSerial(null);
  };

  return (
    <MainLayout title="ติดตามรายการทรัพย์สิน (Serials)">
      <div className="space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยรหัสซีเรียล, ชื่อสินค้า หรือสถานะ..."
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>รูป</TableHead>
                      <TableHead>รหัสซีเรียล</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>สถานที่</TableHead>
                      <TableHead>สติกเกอร์</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serials.map((serial) => (
                      <TableRow key={serial.id}>
                        <TableCell>
                          {serial.image_url ? (
                            <img src={serial.image_url} alt="Item" className="h-10 w-10 rounded object-cover border" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {serial.serial_code}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{serial.products?.name}</span>
                            <span className="text-xs text-muted-foreground">{serial.products?.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={serial.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {serial.locations ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {serial.locations.name}
                              {serial.locations.building && ` (${serial.locations.building})`}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={serial.sticker_status} />
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
              </div>
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขรายละเอียดทรัพย์สิน</DialogTitle>
          </DialogHeader>
          {selectedSerial && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4 border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Barcode className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-mono text-lg font-bold text-primary">{selectedSerial.serial_code}</p>
                  <p className="font-medium">{selectedSerial.products?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Status & Location */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>สถานะทรัพย์สิน</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="พร้อมใช้">พร้อมใช้</SelectItem>
                        <SelectItem value="ถูกยืม">ถูกยืม</SelectItem>
                        <SelectItem value="ไม่พร้อมใช้">ไม่พร้อมใช้ (เสีย)</SelectItem>
                        <SelectItem value="ส่งซ่อม">ส่งซ่อม</SelectItem>
                        <SelectItem value="ไม่ใช้แล้ว">ไม่ใช้แล้ว (เลิกใช้งาน)</SelectItem>
                        <SelectItem value="หาย">หาย</SelectItem>
                        <SelectItem value="ทิ้งแล้ว">ทิ้งแล้ว (จำหน่ายออก)</SelectItem>
                        <SelectItem value="ไม่เปิดใช้งาน">ไม่เปิดใช้งาน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>สถานที่เก็บ (Location)</Label>
                    <Select
                      value={editForm.location_id}
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, location_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="ระบุตำแหน่งจัดเก็บ" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.building && `(${loc.building})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      * หากไม่มีสถานที่ ให้ไปเพิ่มที่เมนู "ตั้งค่า" ก่อน
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>รูปถ่ายสภาพสินค้าจริง</Label>
                    <div className="flex items-start gap-4 p-4 border rounded-lg border-dashed">
                      {editForm.image_url ? (
                        <div className="relative group">
                          <img
                            src={editForm.image_url}
                            alt="Item"
                            className="h-24 w-24 rounded-lg object-cover border"
                          />
                          <button 
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditForm(prev => ({ ...prev, image_url: '' }))}
                          >
                            <span className="sr-only">Delete</span>
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                          <Camera className="h-8 w-8 mb-1" />
                          <span className="text-xs">No Image</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment" // เปิดกล้องมือถือ
                          onChange={(e) => handleUpload(e, 'image_url')}
                          disabled={isUploading}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          ถ่ายรูปสภาพปัจจุบันของทรัพย์สินเพื่อเป็นหลักฐาน
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Sticker & Notes */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>การติดสติกเกอร์</Label>
                    <div className="flex gap-4">
                      <Select
                        value={editForm.sticker_status}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, sticker_status: value }))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="รอติดสติ๊กเกอร์">รอติดสติ๊กเกอร์</SelectItem>
                          <SelectItem value="ติดแล้ว">ติดแล้ว</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {editForm.sticker_status === 'ติดแล้ว' && (
                        <Input
                          type="date"
                          className="w-40"
                          value={editForm.sticker_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, sticker_date: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>

                  {editForm.sticker_status === 'ติดแล้ว' && (
                    <div className="space-y-2">
                      <Label>รูปยืนยันการติดสติกเกอร์</Label>
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
                          capture="environment"
                          onChange={(e) => handleUpload(e, 'sticker_image_url')}
                          disabled={isUploading}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>หมายเหตุ / โน๊ตเพิ่มเติม</Label>
                    <Textarea 
                      placeholder="เช่น ฝากไว้ที่..., จอมีรอยขีดข่วน, สายชาร์จของเทียบ..."
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdate} disabled={updateSerial.isPending || isUploading}>
                  {updateSerial.isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}