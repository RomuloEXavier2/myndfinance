-- Create debug_logs table for sync error tracking
CREATE TABLE public.debug_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  level TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own logs
CREATE POLICY "Users can view their own debug_logs"
ON public.debug_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert logs (from edge functions)
CREATE POLICY "Service role can insert debug_logs"
ON public.debug_logs
FOR INSERT
WITH CHECK (true);

-- Users can delete their own logs
CREATE POLICY "Users can delete their own debug_logs"
ON public.debug_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_debug_logs_user_created ON public.debug_logs(user_id, created_at DESC);