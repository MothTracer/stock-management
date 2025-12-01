// ... imports เดิม ...
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
import { Plus, Package, Trash2, Image as ImageIcon, X, Pencil, Box } from "lucide-react"; // เพิ่ม Icon Box
import { useProducts, useDeleteProduct, useUpdateProduct, useCreateProduct, Product } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge"; // เพิ่ม Badge

// ... categories constant เดิม ...
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
  // ... hooks และ states เดิม ...
  const { data: products, isLoading } = useProducts();
  const createProductHook = useCreateProduct();
  const updateProductHook = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  // ... Options states และ functions เดิม (handleAddOption, handleRemoveOption, etc.) ...
  const [nameOptions, setNameOptions] = useState(["AIO", "Notebook", "Mouse", "Monitor"]);
  const [modelOptions, setModelOptions] = useState(["Gen 1", "Gen 2", "Gen 3"]);
  const [brandOptions, setBrandOptions] = useState(["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"]);
  const [unitOptions, setUnitOptions] = useState(["Piece", "Box", "Set", "Unit"]);

  // ... openAddDialog, openEditDialog functions เดิม ...
  const openAddDialog = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setFormData({
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
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      p_id: product.p_id,
      name: product.name,
      model: product.model || "",
      category: product.category,
      brand: product.brand || "",
      description: product.description || "",
      notes: product.notes || "",
      price: product.price.toString(),
      unit: product.unit,
      image_url: product.image_url || "",
      initial_quantity: (product.stock_total || 0).toString(), // ใช้ stock_total แทน quantity เดิม
    });
    setIsDialogOpen(true);
  };

  // ... getCategoryPrefix เดิม ...
  const getCategoryPrefix = (category: string) => {
    const match = category.match(/\(([^)]+)\)/);
    return match ? match[1].toUpperCase() : "GEN";
  };

  // *** แก้ไข function generateSku ให้เป็น 4 หลัก ***
  const generateSku = async (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    
    if (isEditing) return; 

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
      
      // เปลี่ยนตรงนี้: บังคับให้เป็น 4 หลัก (0001)
      const padLength = 4; 
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

  // ... handleImageUpload, handleAddOption, handleRemoveOption, handleSelectOption, OptionChips, handleSubmit ...
  // (ฟังก์ชันเหล่านี้ใช้ Logic เดิมได้เลย แต่ตอน handleSubmit มันจะไปเรียก hook ที่เราแก้ไว้แล้ว)
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

  const OptionChips = ({ options, field }: { options: string[]; field: 'name' | 'brand' | 'unit' | 'model'; }) => (
    <div className="flex flex-wrap gap-2 rounded-md border bg-muted/50 p-2">
      {options.map(option => (
        <div key={option} className="flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm shadow-sm">
          <button type="button" className="font-medium hover:underline" onClick={() => handleSelectOption(field, option)}>
            {option}
          </button>
          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveOption(field, option)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createProductHook.isPending || updateProductHook.isPending) return;

    try {
      const commonData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        model: formData.model,
        description: formData.description,
        notes: formData.notes,
        price: parseFloat(formData.price) || 0,
        unit: formData.unit,
        image_url: formData.image_url,
        initial_quantity: parseInt(formData.initial_quantity) || 0,
      };

      if (isEditing && selectedProduct) {
        await updateProductHook.mutateAsync({
          id: selectedProduct.id,
          current_quantity: selectedProduct.stock_total || 0, // ใช้ stock_total
          p_id: formData.p_id,
          ...commonData
        });
      } else {
        await createProductHook.mutateAsync({
          p_id: formData.p_id,
          ...commonData
        });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
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
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Keep every product and asset organized in one place</p>
          <Button className="gap-2" onClick={openAddDialog}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {/* --- ส่วน Grid ที่ปรับปรุง --- */}
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
              <Card key={product.id} className="group overflow-hidden transition-all hover:shadow-lg border hover:border-primary/20">
                <CardContent className="p-0">
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] bg-muted/30">
                    <Badge variant="secondary" className="absolute top-2 left-2 z-10 bg-black/90 backdrop-blur-sm font-mono text-xs">
                      {product.p_id}
                    </Badge>
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-contain p-4 mix-blend-multiply"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white text-primary shadow-sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shadow-sm"
                        onClick={() => {
                          if(confirm('Are you sure you want to delete this product? All serials will be deleted.')) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {product.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {product.brand} {product.model}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground line-clamp-1" title={product.name}>
                        {product.name}
                      </h3>
                    </div>

                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-0.5">Price</span>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-muted-foreground mb-1">Available / Total</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
                          <Box className={`h-3.5 w-3.5 ${product.stock_available > 0 ? 'text-success' : 'text-destructive'}`} />
                          <span className={`text-sm font-bold ${product.stock_available > 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {product.stock_available}
                          </span>
                          <span className="text-muted-foreground text-xs">/</span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {product.stock_total}
                          </span>
                        </div>
                      </div>
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
              <Button className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Shared for Add and Edit */}
      {/* ... ส่วน Dialog Code ด้านล่าง ใช้เหมือนเดิมได้เลยครับ เพราะเราแก้ logic state ไปแล้ว ... */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[640px] sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Product & Stock" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => generateSku(value)}
                  disabled={isEditing}
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
                {!isEditing && <p className="text-xs text-muted-foreground">
                  เลือกหมวดหมู่เพื่อสร้างรหัส SKU (4 หลัก)
                </p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p_id">SKU (ID)</Label>
                <Input
                  id="p_id"
                  placeholder="เช่น IT-0001"
                  value={formData.p_id}
                  readOnly={true}
                  className="bg-muted font-mono"
                />
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
                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddOption('name', formData.name)}>Add to quick list</Button>
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
                placeholder="รายละเอียดเพิ่มเติม"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial_quantity" className="flex justify-between">
                  {isEditing ? "Total Quantity (Update to Add)" : "Initial Quantity"}
                  {isEditing && (
                    <span className="text-xs text-primary font-normal">
                      Current Total: {selectedProduct?.stock_total}
                    </span>
                  )}
                </Label>
                <Input
                  id="initial_quantity"
                  type="number"
                  min={isEditing ? selectedProduct?.stock_total : "0"}
                  placeholder="1"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, initial_quantity: e.target.value }))}
                  className={isEditing ? "border-primary bg-primary/5" : ""}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    * หากเพิ่มตัวเลข ระบบจะสร้าง Serial ใหม่ (เช่น {formData.p_id}-XXXX) ให้เท่ากับจำนวนที่เพิ่ม
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g. piece"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
                <OptionChips options={unitOptions} field="unit" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="h-20 w-20 rounded-lg object-cover border" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="w-auto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProductHook.isPending || updateProductHook.isPending || isGeneratingSku}>
                {(createProductHook.isPending || updateProductHook.isPending) ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}