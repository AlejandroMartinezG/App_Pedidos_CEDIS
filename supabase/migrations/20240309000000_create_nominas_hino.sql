-- Create nominas_hino table
CREATE TABLE IF NOT EXISTS public.nominas_hino (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operador TEXT NOT NULL,
    economico TEXT NOT NULL,
    placas TEXT NOT NULL,
    semana_inicio DATE NOT NULL,
    semana_fin DATE NOT NULL,
    pagar_en TEXT NOT NULL,
    viajes JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_viajes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.nominas_hino ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can do everything on nominas_hino" ON public.nominas_hino
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_nominas_hino_semana ON public.nominas_hino (semana_inicio, semana_fin);
