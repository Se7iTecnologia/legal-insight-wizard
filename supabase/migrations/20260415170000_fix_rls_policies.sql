-- Fix RLS policies for all tables: restrict to authenticated users owning the data

-- ============ CASOS ============
DROP POLICY IF EXISTS "casos_select" ON public.casos;
DROP POLICY IF EXISTS "casos_insert" ON public.casos;
DROP POLICY IF EXISTS "casos_update" ON public.casos;
DROP POLICY IF EXISTS "casos_delete" ON public.casos;

CREATE POLICY "casos_select" ON public.casos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "casos_insert" ON public.casos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "casos_update" ON public.casos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "casos_delete" ON public.casos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ CLIENTES ============
ALTER TABLE public.clientes ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Permite leitura pública" ON public.clientes;
DROP POLICY IF EXISTS "Permite inserção pública" ON public.clientes;
DROP POLICY IF EXISTS "Permite atualização pública" ON public.clientes;
DROP POLICY IF EXISTS "Permite exclusão pública" ON public.clientes;

CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ DOCUMENTOS_CASO ============
DROP POLICY IF EXISTS "docs_caso_select" ON public.documentos_caso;
DROP POLICY IF EXISTS "docs_caso_insert" ON public.documentos_caso;
DROP POLICY IF EXISTS "docs_caso_update" ON public.documentos_caso;
DROP POLICY IF EXISTS "docs_caso_delete" ON public.documentos_caso;

CREATE POLICY "docs_caso_select" ON public.documentos_caso FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "docs_caso_insert" ON public.documentos_caso FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "docs_caso_update" ON public.documentos_caso FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "docs_caso_delete" ON public.documentos_caso FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TEMPLATES ============
DROP POLICY IF EXISTS "templates_select" ON public.templates;
DROP POLICY IF EXISTS "templates_insert" ON public.templates;
DROP POLICY IF EXISTS "templates_update" ON public.templates;
DROP POLICY IF EXISTS "templates_delete" ON public.templates;

CREATE POLICY "templates_select" ON public.templates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "templates_insert" ON public.templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_update" ON public.templates FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "templates_delete" ON public.templates FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ STORAGE: CONTRATOS ============
DROP POLICY IF EXISTS "contratos_select" ON storage.objects;
DROP POLICY IF EXISTS "contratos_upload" ON storage.objects;
DROP POLICY IF EXISTS "contratos_delete" ON storage.objects;

CREATE POLICY "contratos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contratos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "contratos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "contratos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contratos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ FIX FUNCTION SEARCH PATHS ============
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_caso_codigo()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.codigo = '' OR NEW.codigo IS NULL THEN
    NEW.codigo := 'REV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('caso_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'advogado')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
