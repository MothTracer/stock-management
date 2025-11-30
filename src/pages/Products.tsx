import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useProducts, useDeleteProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = [
  "ไอที/อิเล็กทรอนิกส์ (IT)",
  "เฟอร์นิเจอร์ (FR)",
  "เครื่องมือ/อุปกรณ์ช่าง (TL)",
  "เสื้อผ้าและเครื่องแต่งกาย (CL)",
  "วัสดุสิ้นเปลือง (CS)",
  "อุปกรณ์สำนักงาน (ST)",
  "อะไหล่/ชิ้นส่วนสำรอง (SP)",
  "เครื่องใช้ไฟฟ้าบาง (AP)",
  "อุปกรณ์ความปลอดภัย (PP)",
  "อุปกรณ์โสต/สื่อ (AV)",
];

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  const [formData, setFormData] = useState({
    p_id: "",
    name: "",
    model: "",
    category: "",
    brand: "",
    description: "",
    notes: "",
    price: "",
    unit: "Piece",
    image_url: "",
    initial_quantity: "1",
  });
  const [nameOptions, setNameOptions] = useState(["AIO", "Notebook", "Mouse", "Monitor"]);
  const [modelOptions, setModelOptions] = useState(["Gen 1", "Gen 2", "Gen 3"]);
  const [brandOptions, setBrandOptions] = useState(["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"]);
  const [unitOptions, setUnitOptions] = useState(["Piece", "Box", "Set", "Unit"]);

  const getCategoryPrefix = (category: string) => {
    const match = category.match(/\(([^)]+)\)/);
    return match ? match[1].toUpperCase() : "GEN";
  };

  const generateSku = async (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    const prefix = getCategoryPrefix(category);
    const currentCategory = category;
    setIsGeneratingSku(true);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('p_id')
        .ilike('p_id', `${prefix}-%`)
        .order('p_id', { ascending: false })
        .limit(1);

      if (error) throw error;

      const lastCode = data?.[0]?.p_id;
      const match = lastCode?.match(/-(\d+)$/);
      const lastNumber = match ? parseInt(match[1], 10) : 0;
      const nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
      const padLength = match ? Math.max(3, match[1].length) : 3;
      const nextSku = `${prefix}-${String(nextNumber).padStart(padLength, '0')}`;

      setFormData(prev => (
        prev.category === currentCategory
          ? { ...prev, p_id: nextSku }
          : prev
      ));
    } catch (err) {
      toast.error('SKU generation failed');
      setFormData(prev => ({ ...prev, category }));
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('asset-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddOption = (field: 'name' | 'brand' | 'unit' | 'model', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const addIfNew = (options: string[], setter: (opts: string[]) => void) => {
      if (!options.includes(trimmed)) {
        setter([...options, trimmed]);
      }
    };

    if (field === 'name') addIfNew(nameOptions, setNameOptions);
    if (field === 'model') addIfNew(modelOptions, setModelOptions);
    if (field === 'brand') addIfNew(brandOptions, setBrandOptions);
    if (field === 'unit') addIfNew(unitOptions, setUnitOptions);
  };

  const handleRemoveOption = (field: 'name' | 'brand' | 'unit' | 'model', value: string) => {
    if (field === 'name') setNameOptions(prev => prev.filter(v => v !== value));
    if (field === 'model') setModelOptions(prev => prev.filter(v => v !== value));
    if (field === 'brand') setBrandOptions(prev => prev.filter(v => v !== value));
    if (field === 'unit') setUnitOptions(prev => prev.filter(v => v !== value));
    setFormData(prev => prev[field] === value ? { ...prev, [field]: "" } as typeof prev : prev);
  };

  const handleSelectOption = (field: 'name' | 'brand' | 'unit' | 'model', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value } as typeof prev));
  };

  const OptionChips = ({
    options,
    field,
  }: {
    options: string[];
    field: 'name' | 'brand' | 'unit' | 'model';
  }) => (
    <div className="flex flex-wrap gap-2 rounded-md border bg-muted/50 p-2">
      {options.map(option => (
        <div key={option} className="flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm shadow-sm">
          <button
            type="button"
            className="font-medium hover:underline"
            onClick={() => handleSelectOption(field, option)}
          >
            {option}
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => handleRemoveOption(field, option)}
            aria-label={`Remove ${option}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {options.length === 0 && (
        <span className="text-xs text-muted-foreground">ยังไม่มีตัวเลือกที่บันทึกไว้</span>
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. บันทึกข้อมูลสินค้าแม่ (Product)
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert([{
          p_id: formData.p_id,
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          model: formData.model, // เพิ่ม model
          description: formData.description, // เพิ่ม description
          notes: formData.notes, // เพิ่ม notes
          price: parseFloat(formData.price) || 0,
          unit: formData.unit,
          image_url: formData.image_url,
          // *** จุดที่แก้: แปลง initial_quantity จากฟอร์ม ให้ลงช่อง quantity ใน DB ***
          quantity: parseInt(formData.initial_quantity) || 0, 
        }])
        .select()
        .single();

      if (productError) throw productError;

      // 2. ถ้าบันทึกแม่สำเร็จ -> สร้างลูก (Serials)
      if (newProduct) {
        const qty = parseInt(formData.initial_quantity) || 0;
        
        if (qty > 0) {
          const serialsArray = [];
          for (let i = 0; i < qty; i++) {
            serialsArray.push({
              product_id: newProduct.id,
              // เจนรหัสลูก เช่น IT-001-01, IT-001-02
              serial_code: `${newProduct.p_id}-${String(i + 1).padStart(2, '0')}`,
              status: 'พร้อมใช้',         // แก้เป็นภาษาไทยให้ตรงกับระบบ
              sticker_status: 'รอติดสติ๊กเกอร์', // แก้เป็นภาษาไทย
            });
          }
          
          const { error: serialError } = await supabase
            .from('product_serials')
            .insert(serialsArray);

          if (serialError) throw serialError;
        }
      }

      toast.success('บันทึกสินค้าและสร้างรายการย่อยเรียบร้อย');
      setIsDialogOpen(false);
      
      // รีเฟรชหน้าแบบบ้านๆ เพื่อให้เห็นของทันที
      window.location.reload(); 

    } catch (error: any) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <MainLayout title="Product & Asset Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Keep every product and asset organized in one place
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[640px] sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => generateSku(value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      เลือกหมวดหมู่ก่อนเพื่อให้ระบบสร้างรหัส SKU ถัดไปให้อัตโนมัติ
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p_id">SKU</Label>
                    <Input
                      id="p_id"
                      placeholder="สร้างรหัสอัตโนมัติถ้าเลือกหมวดหมู่"
                      value={formData.p_id}
                      readOnly={!formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, p_id: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isGeneratingSku ? 'กำลังสร้างรหัส...' : 'สามารถปรับแก้รหัสได้หลังระบบสร้างให้แล้ว'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Laptop"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAddOption('name', formData.name)}
                    >
                      Add to quick list
                    </Button>
                    <span className="text-xs text-muted-foreground">กดที่ตัวเลือกเพื่อกรอกอัตโนมัติ กด X เพื่อลบ</span>
                  </div>
                  <OptionChips options={nameOptions} field="name" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        placeholder="e.g. Dell"
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddOption('brand', formData.brand)}
                        >
                          Add to quick list
                        </Button>
                        <span className="text-xs text-muted-foreground">กดที่ตัวเลือกเพื่อกรอกอัตโนมัติ กด X เพื่อลบ</span>
                      </div>
                      <OptionChips options={brandOptions} field="brand" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="e.g. M15 Gen 2"
                        value={formData.model}
                        onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddOption('model', formData.model)}
                        >
                          Add to quick list
                        </Button>
                        <span className="text-xs text-muted-foreground">กดที่ตัวเลือกเพื่อกรอกอัตโนมัติ กด X เพื่อลบ</span>
                      </div>
                      <OptionChips options={modelOptions} field="model" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (THB)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Add key specs, color, accessories or usage notes."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initial_quantity">Initial Quantity</Label>
                    <Input
                      id="initial_quantity"
                      type="number"
                      min="0"
                      placeholder="1"
                      value={formData.initial_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, initial_quantity: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      placeholder="e.g. piece"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAddOption('unit', formData.unit)}
                      >
                        Add to quick list
                      </Button>
                      <span className="text-xs text-muted-foreground">กดที่ตัวเลือกเพื่อกรอกอัตโนมัติ กด X เพื่อลบ</span>
                    </div>
                    <OptionChips options={unitOptions} field="unit" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-4">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="w-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG or PNG, up to 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Internal notes such as warranty info or storage location."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || isGeneratingSku}>
                    {isSaving ? 'Saving...' : 'Save Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-40 w-full rounded-lg mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="group overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteProduct.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-primary">{product.p_id}</p>
                        <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{product.category}</span>
                      <span className="font-medium">{product.serial_count} {product.unit}</span>
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No products found yet</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
