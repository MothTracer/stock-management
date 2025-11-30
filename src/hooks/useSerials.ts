import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductSerial {
  id: string;
  product_id: string;
  serial_code: string;
  status: 'Ready' | 'Borrowed' | 'Repair' | 'Missing';
  sticker_status: 'Pending' | 'Done';
  sticker_date: string | null;
  sticker_image_url: string | null;
  location_id: string | null;
  created_at: string;
  products?: {
    name: string;
    p_id: string;
    category: string;
  };
  locations?: {
    name: string;
    building: string | null;
  } | null;
}

export interface UpdateSerialInput {
  id: string;
  status?: 'Ready' | 'Borrowed' | 'Repair' | 'Missing';
  sticker_status?: 'Pending' | 'Done';
  sticker_date?: string | null;
  sticker_image_url?: string | null;
  location_id?: string | null;
}

export function useSerials(search?: string) {
  return useQuery({
    queryKey: ['serials', search],
    queryFn: async () => {
      let query = supabase
        .from('product_serials')
        .select(`
          *,
          products (name, p_id, category),
          locations (name, building)
        `)
        .order('created_at', { ascending: false });
      
      if (search) {
        query = query.or(`serial_code.ilike.%${search}%,products.name.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ProductSerial[];
    },
  });
}

export function useAvailableSerials() {
  return useQuery({
    queryKey: ['serials', 'available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_serials')
        .select(`
          *,
          products (name, p_id, category)
        `)
        .eq('status', 'Ready')
        .order('serial_code', { ascending: true });
      
      if (error) throw error;
      return data as ProductSerial[];
    },
  });
}

export function useUpdateSerial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateSerialInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('product_serials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('อัปเดตข้อมูลสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}
