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
  quantity?: number;
  image_url: string | null;
  created_at: string;
  serial_count?: number;
}

export interface CreateProductInput {
  p_id: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  unit: string;
  image_url?: string;
  initial_quantity: number;
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
          price: input.price,
          unit: input.unit,
          image_url: input.image_url,
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // Create serials if quantity > 0
      if (input.initial_quantity > 0) {
        const serials = Array.from({ length: input.initial_quantity }, (_, i) => ({
          product_id: product.id,
          serial_code: `${input.p_id}-${String(i + 1).padStart(2, '0')}`,
          status: 'Ready' as const,
          sticker_status: 'Pending' as const,
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
      toast.success('Product created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create product: ${error.message}`);
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
