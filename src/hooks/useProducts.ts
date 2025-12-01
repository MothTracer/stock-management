import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Product {
  id: string;
  p_id: string;
  name: string;
  model?: string | null;
  category: string;
  brand: string | null;
  description?: string | null;
  notes?: string | null;
  price: number;
  unit: string;
  quantity?: number; // จำนวนสินค้าทั้งหมด
  image_url: string | null;
  created_at: string;
  serial_count?: number;
}

export interface CreateProductInput {
  p_id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  description?: string;
  notes?: string;
  price: number;
  unit: string;
  image_url?: string;
  initial_quantity: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  id: string;
  current_quantity: number; // จำนวนเดิมเพื่อเอามาเทียบ
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get serial counts for each product
      const productIds = products.map(p => p.id);
      const { data: serialCounts, error: countError } = await supabase
        .from('product_serials')
        .select('product_id')
        .in('product_id', productIds);
      
      if (countError) throw countError;
      
      // Count serials per product
      const countMap = serialCounts.reduce((acc, s) => {
        acc[s.product_id] = (acc[s.product_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return products.map(p => ({
        ...p,
        serial_count: countMap[p.id] || 0
      })) as Product[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          p_id: input.p_id,
          name: input.name,
          category: input.category,
          brand: input.brand,
          model: input.model,
          description: input.description,
          notes: input.notes,
          price: input.price,
          unit: input.unit,
          image_url: input.image_url,
          quantity: input.initial_quantity, // บันทึกจำนวนรวม
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Create serials if quantity > 0
      if (input.initial_quantity > 0) {
        const serials = Array.from({ length: input.initial_quantity }, (_, i) => ({
          product_id: product.id,
          serial_code: `${input.p_id}-${String(i + 1).padStart(2, '0')}`,
          status: 'พร้อมใช้' as const,
          sticker_status: 'รอติดสติ๊กเกอร์' as const,
        }));
        
        const { error: serialError } = await supabase
          .from('product_serials')
          .insert(serials);
        
        if (serialError) throw serialError;
      }
      
      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });
}

// *** เพิ่ม Hook สำหรับ Update ***
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProductInput) => {
      // 1. อัปเดตข้อมูลสินค้าหลัก
      const { data: product, error: productError } = await supabase
        .from('products')
        .update({
          name: input.name,
          category: input.category,
          brand: input.brand,
          model: input.model,
          description: input.description,
          notes: input.notes,
          price: input.price,
          unit: input.unit,
          image_url: input.image_url,
          quantity: input.initial_quantity, // อัปเดตจำนวนใหม่
        })
        .eq('id', input.id)
        .select()
        .single();

      if (productError) throw productError;

      // 2. ตรวจสอบว่ามีการเพิ่มจำนวนสินค้าหรือไม่
      const newQuantity = input.initial_quantity || 0;
      const oldQuantity = input.current_quantity || 0;
      
      if (newQuantity > oldQuantity) {
        const diff = newQuantity - oldQuantity;
        
        // หา Serial ตัวล่าสุดเพื่อรันเลขต่อ
        const { data: lastSerial, error: serialQueryError } = await supabase
          .from('product_serials')
          .select('serial_code')
          .eq('product_id', input.id)
          .order('serial_code', { ascending: false })
          .limit(1)
          .maybeSingle(); // ใช้ maybeSingle กันกรณีไม่มี serial เดิมเลย

        let startNumber = 0;
        if (lastSerial && lastSerial.serial_code) {
            // สมมติ format คือ SKU-01, SKU-02 ดึงเลขท้ายมา
            const parts = lastSerial.serial_code.split('-');
            const lastNumStr = parts[parts.length - 1];
            startNumber = parseInt(lastNumStr, 10) || 0;
        }

        // สร้าง Serial ใหม่
        const newSerials = Array.from({ length: diff }, (_, i) => ({
          product_id: input.id,
          // ใช้ p_id เดิม หรือ p_id ใหม่ถ้าระบบอนุญาตให้แก้ p_id แต่แนะนำให้ใช้ p_id จาก product ที่ query มา
          serial_code: `${product.p_id}-${String(startNumber + i + 1).padStart(2, '0')}`,
          status: 'พร้อมใช้' as const,
          sticker_status: 'รอติดสติ๊กเกอร์' as const,
        }));

        if (newSerials.length > 0) {
            const { error: insertError } = await supabase
            .from('product_serials')
            .insert(newSerials);
            
            if (insertError) throw insertError;
        }
      }

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('Product updated & Stock added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('Product deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });
}