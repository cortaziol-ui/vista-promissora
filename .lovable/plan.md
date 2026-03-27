

## Plano: Corrigir permissões da tabela app_settings

Executar uma migration SQL que:
1. Remove as duas políticas RLS existentes (`Authenticated users can read app_settings` e `Admins can manage app_settings`)
2. Cria duas novas políticas que permitem **todos os usuários autenticados** ler e escrever na tabela `app_settings`

Isso resolve o problema de permissão onde apenas admins podiam salvar configurações (como o token Meta e ad_account_id).

### Detalhes técnicos

Uma única migration com o SQL fornecido — drop das políticas antigas e criação de `read_app_settings` (SELECT) e `write_app_settings` (ALL) para `authenticated`.

**Nota de segurança**: Isso abre escrita na `app_settings` para qualquer usuário autenticado. Se no futuro quiser restringir a escrita apenas a admins/managers, será necessário ajustar a política `write_app_settings`.

