import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductSerial {
  id: string;
  product_id: string;
  serial_code: string;
  status: string; // เปลี่ยนเป็น string เพื่อรองรับค่าไทยได้อิสระ
  sticker_status: string;
  sticker_date: string | null;
  sticker_image_url: string | null;
  image_url: string | null; // เพิ่ม: รูปสินค้าจริง
  notes: string | null;     // เพิ่ม: โน๊ต
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
  status?: string;
  sticker_status?: string;
  sticker_date?: string | null;
  sticker_image_url?: string | null;
  image_url?: string | null; // เพิ่ม
  notes?: string | null;     // เพิ่ม
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
        .order('serial_code', { ascending: true }); // เรียงตามรหัสจะหาง่ายกว่า
      
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
        .or('status.eq.Ready,status.eq.พร้อมใช้') // รองรับทั้งไทยและอังกฤษ
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
      toast.success('บันทึกข้อมูลเรียบร้อย');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}