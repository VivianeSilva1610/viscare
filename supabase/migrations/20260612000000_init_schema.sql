-- Clean up any broken tables from previous runs
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.routine_steps CASCADE;
DROP TABLE IF EXISTS public.routines CASCADE;
DROP TABLE IF EXISTS public.reminders CASCADE;
DROP TABLE IF EXISTS public.compatibility_rules CASCADE;
DROP TABLE IF EXISTS public.user_products CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.skin_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    subscription_plan TEXT NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    streak_count INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. SKIN_PROFILES TABLE
CREATE TABLE public.skin_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    skin_type TEXT NOT NULL,
    age INT NOT NULL,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    goals TEXT[] NOT NULL DEFAULT '{}',
    concerns TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.skin_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own skin profile" ON public.skin_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skin profile" ON public.skin_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skin profile" ON public.skin_profiles FOR UPDATE USING (auth.uid() = user_id);

-- 3. PRODUCTS TABLE
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    active_ingredients TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global products" ON public.products FOR SELECT USING (true);

-- 4. USER_PRODUCTS TABLE
CREATE TABLE public.user_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    custom_name TEXT NOT NULL,
    custom_brand TEXT NOT NULL,
    custom_category TEXT NOT NULL,
    custom_active_ingredients TEXT[] NOT NULL DEFAULT '{}',
    opened_at DATE,
    expiration_months INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own products" ON public.user_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON public.user_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON public.user_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON public.user_products FOR DELETE USING (auth.uid() = user_id);

-- 5. INGREDIENTS TABLE
CREATE TABLE public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    benefits_it TEXT NOT NULL,
    benefits_en TEXT NOT NULL,
    benefits_pt TEXT NOT NULL,
    evidence_level TEXT NOT NULL,
    description_it TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_pt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ingredients" ON public.ingredients FOR SELECT USING (true);

-- 6. ROUTINES TABLE
CREATE TABLE public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('AM', 'PM')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own routines" ON public.routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);

-- 7. ROUTINE_STEPS TABLE
CREATE TABLE public.routine_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    user_product_id UUID NOT NULL REFERENCES public.user_products(id) ON DELETE CASCADE,
    position INT NOT NULL,
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own routine steps" ON public.routine_steps FOR SELECT USING (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can insert their own routine steps" ON public.routine_steps FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can update their own routine steps" ON public.routine_steps FOR UPDATE USING (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can delete their own routine steps" ON public.routine_steps FOR DELETE USING (EXISTS (SELECT 1 FROM public.routines r WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()));

-- 8. COMPATIBILITY_RULES TABLE
CREATE TABLE public.compatibility_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_a TEXT NOT NULL,
    ingredient_b TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('green', 'yellow', 'red')),
    description_it TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_pt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.compatibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view compatibility rules" ON public.compatibility_rules FOR SELECT USING (true);

-- 9. REMINDERS TABLE
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('AM', 'SPF', 'PM')),
    time TIME NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, type)
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert/update their own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);

-- 9b. APPOINTMENTS TABLE
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    dateStr TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);


-- 10. TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, language, subscription_plan)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'language', 'pt'), 'free');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED DATA
INSERT INTO public.compatibility_rules (ingredient_a, ingredient_b, severity, description_it, description_en, description_pt) VALUES
('Retinol', 'Vitamin C', 'red', 'Usa in momenti diversi', 'Use at different times', 'Use em momentos diferentes'),
('Retinol', 'AHA/BHA', 'red', 'Esfoliazione estrema', 'Extreme exfoliation', 'Esfoliação extrema'),
('AHA/BHA', 'Vitamin C', 'yellow', 'Puo irritare', 'May irritate', 'Pode irritar'),
('Retinol', 'Hyaluronic Acid', 'green', 'Ottimo mix', 'Great mix', 'Ótima combinação'),
('Niacinamide', 'Vitamin C', 'yellow', 'Separare', 'Separate', 'Separar'),
('Niacinamide', 'Retinol', 'green', 'Lenitivo', 'Soothing', 'Acalma a pele');

INSERT INTO public.ingredients (name, benefits_it, benefits_en, benefits_pt, evidence_level, description_it, description_en, description_pt) VALUES
('Retinol', 'Antietà', 'Anti-aging', 'Antienvelhecimento', 'High', 'Derivato A', 'Vitamin A', 'Vitamina A'),
('Vitamin C', 'Antiossidante', 'Antioxidant', 'Antioxidante', 'High', 'Luminosita', 'Brightness', 'Brilho'),
('Hyaluronic Acid', 'Idratazione', 'Hydration', 'Hidratação', 'High', 'Idrata', 'Hydrates', 'Hidrata'),
('AHA/BHA', 'Esfoliazione', 'Exfoliation', 'Esfoliação', 'High', 'Esfolia', 'Exfoliates', 'Esfolia'),
('Niacinamide', 'Regolazione', 'Regulation', 'Regulação', 'High', 'Vitamina B3', 'Vitamin B3', 'Vitamina B3');

INSERT INTO public.products (name, brand, category, active_ingredients) VALUES
('Gentle Cleanser', 'CeraVe', 'cleanser', '{"Hyaluronic Acid"}'),
('Hydrating Cleanser', 'Cetaphil', 'cleanser', '{"Niacinamide"}'),
('BHA Blackhead Power Liquid', 'COSRX', 'toner', '{"AHA/BHA"}'),
('Glycolic Acid 7% Toning Solution', 'The Ordinary', 'toner', '{"AHA/BHA"}'),
('Retinol 0.2% in Squalane', 'The Ordinary', 'treatment', '{"Retinol"}'),
('Hyaluronic Acid 2% + B5', 'The Ordinary', 'treatment', '{"Hyaluronic Acid"}'),
('Vitamin C 15% Super Serum', 'Paulas Choice', 'treatment', '{"Vitamin C"}'),
('Natural Moisturizing Factors + HA', 'The Ordinary', 'moisturizer', '{"Hyaluronic Acid"}'),
('Ultra Facial Cream', 'Kiehls', 'moisturizer', '{"Hyaluronic Acid"}'),
('Anthelios UVMune 400 SPF 50+', 'La Roche-Posay', 'spf', '{}'),
('Watery Essence SPF 50+', 'Bioré', 'spf', '{"Hyaluronic Acid"}');
