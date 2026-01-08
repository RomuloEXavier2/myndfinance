-- Create transactions table for MYND CFO
CREATE TABLE public.transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA', 'RESERVA')),
    categoria TEXT NOT NULL DEFAULT 'Geral',
    forma_pagamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_tipo ON public.transactions(tipo);