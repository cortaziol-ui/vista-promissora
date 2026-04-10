-- ============================================
-- Adicionar roles administrativo e financeiro
-- ============================================

-- 1. Expandir enum app_role com os novos valores
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'administrativo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';

-- 2. Reatribuir roles aos usuários (a migration anterior falhou porque o enum não tinha esses valores)
SELECT public.create_app_user('adm@outcom.com', 'Adm2026!', 'administrativo');
SELECT public.create_app_user('financeiro@outcom.com', 'Fin2026!', 'financeiro');

-- 3. Forçar reset de senha (create_app_user não reseta senha de usuários existentes)
SELECT public.change_user_password(
  (SELECT id FROM auth.users WHERE email = 'adm@outcom.com'),
  'Adm2026!'
);
SELECT public.change_user_password(
  (SELECT id FROM auth.users WHERE email = 'financeiro@outcom.com'),
  'Fin2026!'
);

-- 3. Política RLS: administrativo e financeiro podem gerenciar clientes
CREATE POLICY "Administrativo and Financeiro can manage clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'financeiro')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'financeiro')
  );
