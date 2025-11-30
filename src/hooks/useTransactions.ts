import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  employee_id: string;
  serial_id: string;
  borrow_date: string;
  return_date: string | null;
  status: 'Active' | 'Completed';
  note: string | null;
  created_at: string;
  employees?: {
    name: string;
    emp_code: string;
  };
  product_serials?: {
    serial_code: string;
    products?: {
      name: string;
      p_id: string;
    };
  };
}

export interface CreateTransactionInput {
  employee_id: string;
  serial_id: string;
  note?: string;
}

export function useTransactions(status?: 'Active' | 'Completed') {
  return useQuery({
    queryKey: ['transactions', status],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          employees (name, emp_code),
          product_serials (
            serial_code,
            products (name, p_id)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useRecentTransactions(limit: number = 5) {
  return useQuery({
    queryKey: ['transactions', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          employees (name, emp_code),
          product_serials (
            serial_code,
            products (name, p_id)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          employee_id: input.employee_id,
          serial_id: input.serial_id,
          note: input.note,
          status: 'Active',
        })
        .select()
        .single();
      
      if (transactionError) throw transactionError;
      
      // Update serial status to Borrowed
      const { error: serialError } = await supabase
        .from('product_serials')
        .update({ status: 'Borrowed' })
        .eq('id', input.serial_id);
      
      if (serialError) throw serialError;
      
      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('บันทึกการเบิกสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}

export function useReturnTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ transactionId, serialId }: { transactionId: string; serialId: string }) => {
      // Update transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          status: 'Completed',
          return_date: new Date().toISOString(),
        })
        .eq('id', transactionId);
      
      if (transactionError) throw transactionError;
      
      // Update serial status to Ready
      const { error: serialError } = await supabase
        .from('product_serials')
        .update({ status: 'Ready' })
        .eq('id', serialId);
      
      if (serialError) throw serialError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('บันทึกการคืนสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    },
  });
}
