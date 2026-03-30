-- Add 'pago' column to custos_mensais
ALTER TABLE public.custos_mensais ADD COLUMN IF NOT EXISTS pago BOOLEAN NOT NULL DEFAULT false;
