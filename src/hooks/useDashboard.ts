import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalValue: number;
  totalItems: number;
  borrowedCount: number;
  repairCount: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      // Get all products with prices
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, price');
      
      if (productsError) throw productsError;
      
      // Get all serials with their product_id and status
      const { data: serials, error: serialsError } = await supabase
        .from('product_serials')
        .select('product_id, status');
      
      if (serialsError) throw serialsError;
      
      // Calculate stats
      const productPriceMap = products.reduce((acc, p) => {
        acc[p.id] = Number(p.price) || 0;
        return acc;
      }, {} as Record<string, number>);
      
      let totalValue = 0;
      let borrowedCount = 0;
      let repairCount = 0;
      
      serials.forEach(serial => {
        totalValue += productPriceMap[serial.product_id] || 0;
        if (serial.status === 'Borrowed') borrowedCount++;
        if (serial.status === 'Repair') repairCount++;
      });
      
      return {
        totalValue,
        totalItems: serials.length,
        borrowedCount,
        repairCount,
      } as DashboardStats;
    },
  });
}
