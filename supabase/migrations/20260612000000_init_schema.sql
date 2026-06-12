-- Habilitar a extensão uuid-ossp se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA PROFILES (utenti)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'it', -- 'it', 'en', 'pt'
    subscription_plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'premium'
    subscription_expires_at TIMESTAMPTZ,
    streak_count INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. TABELA SKIN_PROFILES (profili_pelle)
CREATE TABLE IF NOT EXISTS public.skin_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    skin_type TEXT NOT NULL, -- 'oily', 'dry', 'combination', 'normal'
    age INT NOT NULL,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    goals TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['hydration', 'acne', 'anti-aging']
    concerns TEXT[] NOT NULL DEFAULT '{}', -- e.g. ['redness', 'dark-spots', 'acne-scars']
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.skin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skin profile" ON public.skin_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skin profile" ON public.skin_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skin profile" ON public.skin_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. TABELA PRODUCTS (prodotti) - Catálogo Global
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL, -- 'cleanser', 'toner', 'treatment', 'moisturizer', 'spf'
    active_ingredients TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global products" ON public.products
    FOR SELECT USING (true);

-- 4. TABELA USER_PRODUCTS (prodotti_utente) - Armário do Usuário
CREATE TABLE IF NOT EXISTS public.user_products (
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

CREATE POLICY "Users can view their own products" ON public.user_products
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products" ON public.user_products
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products" ON public.user_products
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products" ON public.user_products
    FOR DELETE USING (auth.uid() = user_id);

-- 5. TABELA INGREDIENTS (ingredienti) - Catálogo Global
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    benefits_it TEXT NOT NULL,
    benefits_en TEXT NOT NULL,
    benefits_pt TEXT NOT NULL,
    evidence_level TEXT NOT NULL, -- 'High', 'Moderate', 'Low'
    description_it TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_pt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ingredients" ON public.ingredients
    FOR SELECT USING (true);

-- 6. TABELA ROUTINES (routine)
CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('AM', 'PM')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routines" ON public.routines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines" ON public.routines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines" ON public.routines
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines" ON public.routines
    FOR DELETE USING (auth.uid() = user_id);

-- 7. TABELA ROUTINE_STEPS (passaggi_routine)
CREATE TABLE IF NOT EXISTS public.routine_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    user_product_id UUID NOT NULL REFERENCES public.user_products(id) ON DELETE CASCADE,
    position INT NOT NULL, -- Ordem dos passos
    notes TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false, -- Status diário
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routine steps" ON public.routine_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.routines r 
            WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own routine steps" ON public.routine_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routines r 
            WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own routine steps" ON public.routine_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.routines r 
            WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own routine steps" ON public.routine_steps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.routines r 
            WHERE r.id = routine_steps.routine_id AND r.user_id = auth.uid()
        )
    );

-- 8. TABELA COMPATIBILITY_RULES (regole_compatibilità)
CREATE TABLE IF NOT EXISTS public.compatibility_rules (
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

CREATE POLICY "Anyone can view compatibility rules" ON public.compatibility_rules
    FOR SELECT USING (true);

-- 9. TABELA REMINDERS (promemoria)
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('AM', 'SPF', 'PM')),
    time TIME NOT NULL, -- e.g. '07:00:00'
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, type)
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders" ON public.reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own reminders" ON public.reminders
    FOR ALL USING (auth.uid() = user_id);

-- 10. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE APÓS SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, language, subscription_plan)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'language', 'it'), 'free');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- SEED DATA (DADOS INICIAIS)
-- ==========================================

-- Inserir Regras de Compatibilidade
INSERT INTO public.compatibility_rules (ingredient_a, ingredient_b, severity, description_it, description_en, description_pt) VALUES
('Retinolo', 'Vitamina C', 'red', 'Retinolo e Vitamina C richiedono pH diversi e possono causare forti irritazioni se usati insieme. Usa la Vitamina C al mattino e il Retinolo la sera.', 'Retinol and Vitamin C require different pH levels and can cause severe irritation if used together. Use Vitamin C in the morning and Retinol at night.', 'Retinol e Vitamina C requerem pHs diferentes e podem causar irritação severa se usados juntos. Use a Vitamina C de manhã e o Retinol à noite.'),
('Retinolo', 'AHA/BHA', 'red', 'Entrambi esfoliano la pelle. L''uso combinato può danneggiare la barriera cutanea causando secchezza e arrossamento. Alterna le sere d''uso.', 'Both exfoliate the skin. Combined use can compromise the skin barrier leading to extreme dryness and redness. Alternate nights of use.', 'Ambos esfoliam a pele. O uso combinado pode comprometer a barreira cutânea, levando a ressecamento extremo e vermelhidão. Alterne as noites de uso.'),
('AHA/BHA', 'Vitamina C', 'yellow', 'L''uso simultaneo può sovraccaricare la pelle ed esfoliare eccessivamente. Si consiglia di usarli in momenti diversi della giornata.', 'Simultaneous use can overload the skin and over-exfoliate. It is recommended to use them at different times of the day.', 'O uso simultâneo pode sobrecarregar a pele e esfoliar excessivamente. Recomenda-se usá-los em momentos diferentes do dia.'),
('Retinolo', 'Acido Ialuronico', 'green', 'L''Acido Ialuronico idrata in profondità e riduce la secchezza associata al Retinolo. Ottima combinazione per ripristinare la barriera cutanea.', 'Hyaluronic Acid deeply hydrates and reduces dryness associated with Retinol. Excellent combination to restore the skin barrier.', 'O Ácido Hialurônico hidrata profundamente e reduz o ressecamento associado ao Retinol. Excelente combinação para restaurar a barreira da pele.'),
('Niacinamide', 'Vitamina C', 'yellow', 'In alcune formulazioni acide, la Niacinamide può ridurre l''efficacia della Vitamina C. Se la pelle si arrossa, usali separatamente.', 'In some acidic formulations, Niacinamide can decrease Vitamin C effectiveness. If your skin flushes, use them at different times.', 'Em algumas formulações ácidas, a Niacinamida pode diminuir a eficácia da Vitamina C. Se a pele ficar avermelhada, use-os em momentos diferentes.'),
('Niacinamide', 'Retinolo', 'green', 'La Niacinamide lenisce la pelle e rafforza la barriera protettiva, riducendo l''irritazione tipica del Retinolo. Combinazione consigliata.', 'Niacinamide soothes the skin and strengthens the protective barrier, mitigating the typical irritation of Retinol. Recommended combo.', 'A Niacinamida acalma a pele e fortalece a barreira protetora, mitigando a irritação típica do Retinol. Combinação recomendada.');

-- Inserir Ingredientes Globais
INSERT INTO public.ingredients (name, benefits_it, benefits_en, benefits_pt, evidence_level, description_it, description_en, description_pt) VALUES
('Retinolo', 'Antietà, riduzione rughe, rigenerazione cellulare', 'Anti-aging, wrinkle reduction, cell regeneration', 'Antienvelhecimento, redução de rugas, regeneração celular', 'High', 'Derivato della Vitamina A che stimola il turnover cellulare e la produzione di collagene.', 'Vitamin A derivative that stimulates cell turnover and collagen production.', 'Derivado da Vitamina A que estimula a renovação celular e a produção de colágeno.'),
('Vitamina C', 'Antiossidante, illuminante, produzione di collagene', 'Antioxidant, brightening, collagen production', 'Antioxidante, iluminador, produção de colágeno', 'High', 'Potente antiossidante che contrasta i radicali liberi, schiarisce le macchie scure e dona luminosità.', 'Powerful antioxidant that neutralizes free radicals, fades dark spots, and boosts radiance.', 'Potente antioxidante que neutraliza os radicais livres, clareia manchas escuras e aumenta a luminosidade.'),
('Acido Ialuronico', 'Idratazione profonda, rimpolpante, lenitivo', 'Deep hydration, plumping, soothing', 'Hidratação profunda, preenchimento, calmante', 'High', 'Molecola in grado di trattenere fino a 1000 volte il suo peso in acqua per un''idratazione ottimale.', 'Molecule capable of holding up to 1000 times its weight in water for optimal hydration.', 'Molécula capaz de reter até 1000 vezes seu peso em água para uma hidratação ideal.'),
('AHA/BHA', 'Esfoliazione, rimozione cellule morte, pulizia dei pori', 'Exfoliation, dead cell removal, pore clearing', 'Esfoliação, remoção de células mortas, desobstrução dos poros', 'High', 'Acidi (es. Glicolico, Salicilico) che promuovono l''esfoliazione chimica eliminando impurità e cellule morte.', 'Acids (e.g., Glycolic, Salicilyc) promoting chemical exfoliation, removing impurities and dead cells.', 'Ácidos (ex: Glicólico, Salicílico) que promovem a esfoliação química, removendo impurezas e células mortas.'),
('Niacinamide', 'Regolazione del sebo, anti-arrossamento, barriera cutanea', 'Sebum regulation, anti-redness, skin barrier support', 'Regulação do sebo, anti-vermelhidão, suporte à barreira cutânea', 'High', 'Vitamina B3 che riduce l''infiammazione, regola la produzione di sebo e migliora la texture della pelle.', 'Vitamin B3 that reduces inflammation, regulates sebum production, and improves skin texture.', 'Vitamina B3 que reduz a inflamação, regula a produção de sebo e melhora a textura da pele.');

-- Inserir Produtos Globais de Exemplo no Catálogo
INSERT INTO public.products (name, brand, category, active_ingredients) VALUES
('Gentle Cleanser', 'CeraVe', 'cleanser', '{"Acido Ialuronico"}'),
('Hydrating Cleanser', 'Cetaphil', 'cleanser', '{"Niacinamide"}'),
('BHA Blackhead Power Liquid', 'COSRX', 'toner', '{"AHA/BHA"}'),
('Glycolic Acid 7% Toning Solution', 'The Ordinary', 'toner', '{"AHA/BHA"}'),
('Retinol 0.2% in Squalane', 'The Ordinary', 'treatment', '{"Retinolo"}'),
('Hyaluronic Acid 2% + B5', 'The Ordinary', 'treatment', '{"Acido Ialuronico"}'),
('Vitamin C 15% Super Serum', 'Paula''s Choice', 'treatment', '{"Vitamina C"}'),
('Natural Moisturizing Factors + HA', 'The Ordinary', 'moisturizer', '{"Acido Ialuronico"}'),
('Ultra Facial Cream', 'Kiehl''s', 'moisturizer', '{"Acido Ialuronico"}'),
('Anthelios UVMune 400 SPF 50+', 'La Roche-Posay', 'spf', '{}'),
('Watery Essence SPF 50+', 'Bioré', 'spf', '{"Acido Ialuronico"}');
