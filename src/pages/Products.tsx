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
import { Plus, Package, Trash2, Image as ImageIcon, X, Pencil } from "lucide-react";
import { useProducts, useDeleteProduct, useUpdateProduct, useCreateProduct, Product } from "@/hooks/useProducts";
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
  const createProductHook = useCreateProduct(); // เปลี่ยนชื่อเพื่อไม่ให้ซ้ำกับฟังก์ชันเรียกใช้
  const updateProductHook = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);
  
  // Edit State
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

  const [nameOptions, setNameOptions] = useState(["AIO", "Notebook", "Mouse", "Monitor"]);
  const [modelOptions, setModelOptions] = useState(["Gen 1", "Gen 2", "Gen 3"]);
  const [brandOptions, setBrandOptions] = useState(["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple"]);
  const [unitOptions, setUnitOptions] = useState(["Piece", "Box", "Set", "Unit"]);

  // Reset form when opening dialog for Adding
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

  // Populate form when opening dialog for Editing
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
      initial_quantity: (product.quantity || 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const getCategoryPrefix = (category: string) => {
    const match = category.match(/\(([^)]+)\)/);
    return match ? match[1].toUpperCase() : "GEN";
  };

  const generateSku = async (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    
    // ถ้าแก้ไข ไม่ต้องเจน SKU ใหม่ ยกเว้น user อยากเปลี่ยนเอง (แต่ปกติไม่ควรเปลี่ยน prefix)
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
    
    // Check if loading
    if (createProductHook.isPending || updateProductHook.isPending) return;

    try {
      if (isEditing && selectedProduct) {
        // --- Update Logic ---
        await updateProductHook.mutateAsync({
          id: selectedProduct.id,
          current_quantity: selectedProduct.quantity || 0,
          p_id: formData.p_id,
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
        });
      } else {
        // --- Create Logic ---
        await createProductHook.mutateAsync({ // ใช้ Hook ที่เรา rename
          p_id: formData.p_id,
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
        });
      }

      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      // Toast handled in hooks
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
          <Button className="gap-2" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
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
                    
                    {/* Action Buttons Overlay */}
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white text-primary"
                        onClick={() => openEditDialog(product)}
                        title="View/Edit Details"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
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
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-xs text-primary">{product.p_id}</p>
                        <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{product.category}</span>
                      <span className="font-medium px-2 py-0.5 rounded text-xs">
                        {product.quantity} {product.unit} (Total)
                      </span>
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
              <Button className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog: Shared for Add and Edit */}
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
                  disabled={isEditing} // ไม่อนุญาตให้เปลี่ยนหมวดหมู่ตอนแก้ เพื่อรักษา SKU
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
                  เลือกหมวดหมู่ก่อนเพื่อให้ระบบสร้างรหัส SKU ถัดไปให้อัตโนมัติ
                </p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="p_id">SKU</Label>
                <Input
                  id="p_id"
                  placeholder="สร้างรหัสอัตโนมัติ"
                  value={formData.p_id}
                  readOnly={true} // SKU ไม่ควรแก้ด้วยมือเพื่อความปลอดภัยของลำดับ
                  className="bg-muted"
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
                <Label htmlFor="initial_quantity" className="flex justify-between">
                  {isEditing ? "Total Quantity (Update to Add)" : "Initial Quantity"}
                  {isEditing && (
                    <span className="text-xs text-primary font-normal">
                      Current: {selectedProduct?.quantity}
                    </span>
                  )}
                </Label>
                <Input
                  id="initial_quantity"
                  type="number"
                  min={isEditing ? selectedProduct?.quantity : "0"} // ห้ามลดจำนวนต่ำกว่าเดิม
                  placeholder="1"
                  value={formData.initial_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, initial_quantity: e.target.value }))}
                  className={isEditing ? "border-primary bg-primary/5" : ""}
                />
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    * หากเพิ่มตัวเลข ระบบจะสร้าง Serial ใหม่ให้เท่ากับจำนวนที่เพิ่มขึ้น
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAddOption('unit', formData.unit)}
                  >
                    Add to quick list
                  </Button>
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