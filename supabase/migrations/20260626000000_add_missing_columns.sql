-- Add missing columns to user_products
ALTER TABLE public.user_products ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE public.user_products ADD COLUMN IF NOT EXISTS ai_evaluation TEXT;

-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scans_count_this_month INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_scan_date TIMESTAMPTZ;

-- Create facial_scans table
CREATE TABLE IF NOT EXISTS public.facial_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hydration INT NOT NULL,
    wrinkles INT NOT NULL,
    sensitivity INT NOT NULL,
    acne INT NOT NULL,
    diagnosis TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.facial_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own facial scans" ON public.facial_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own facial scans" ON public.facial_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
