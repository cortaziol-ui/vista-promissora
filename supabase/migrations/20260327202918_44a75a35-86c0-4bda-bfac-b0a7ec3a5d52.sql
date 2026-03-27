
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;

CREATE POLICY "read_app_settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "write_app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
