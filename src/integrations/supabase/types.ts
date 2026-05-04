Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          account_id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          account_id: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          account_id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_vendor_links: {
        Row: {
          account_id: string
          campaign_id: string
          campaign_name: string
          created_at: string
          id: string
          is_manual_override: boolean
          month: string
          updated_at: string
          vendedor_id: number | null
          vendedor_nome: string | null
        }
        Insert: {
          account_id: string
          campaign_id: string
          campaign_name: string
          created_at?: string
          id?: string
          is_manual_override?: boolean
          month: string
          updated_at?: string
          vendedor_id?: number | null
          vendedor_nome?: string | null
        }
        Update: {
          account_id?: string
          campaign_id?: string
          campaign_name?: string
          created_at?: string
          id?: string
          is_manual_override?: boolean
          month?: string
          updated_at?: string
          vendedor_id?: number | null
          vendedor_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_vendor_links_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_vendor_links_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          account_id: string
          contatos: Json | null
          cpf: string | null
          created_at: string
          data: string
          email: string | null
          entrada: number
          id: number
          link: string | null
          nascimento: string | null
          nome: string
          parcela1_data_pagamento: string | null
          parcela1_data_prevista: string | null
          parcela1_status: string
          parcela1_valor: number
          parcela2_data_pagamento: string | null
          parcela2_data_prevista: string | null
          parcela2_status: string
          parcela2_valor: number
          parcela3_data_pagamento: string | null
          parcela3_data_prevista: string | null
          parcela3_status: string
          parcela3_valor: number
          referencia1_grau: string | null
          referencia1_nome: string | null
          referencia1_telefone: string | null
          referencia2_grau: string | null
          referencia2_nome: string | null
          referencia2_telefone: string | null
          servico: string
          situacao: string
          telefone: string | null
          valor_total: number
          vendedor: string
        }
        Insert: {
          account_id: string
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          data: string
          email?: string | null
          entrada?: number
          id?: number
          link?: string | null
          nascimento?: string | null
          nome: string
          parcela1_data_pagamento?: string | null
          parcela1_data_prevista?: string | null
          parcela1_status?: string
          parcela1_valor?: number
          parcela2_data_pagamento?: string | null
          parcela2_data_prevista?: string | null
          parcela2_status?: string
          parcela2_valor?: number
          parcela3_data_pagamento?: string | null
          parcela3_data_prevista?: string | null
          parcela3_status?: string
          parcela3_valor?: number
          referencia1_grau?: string | null
          referencia1_nome?: string | null
          referencia1_telefone?: string | null
          referencia2_grau?: string | null
          referencia2_nome?: string | null
          referencia2_telefone?: string | null
          servico?: string
          situacao?: string
          telefone?: string | null
          valor_total?: number
          vendedor: string
        }
        Update: {
          account_id?: string
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          data?: string
          email?: string | null
          entrada?: number
          id?: number
          link?: string | null
          nascimento?: string | null
          nome?: string
          parcela1_data_pagamento?: string | null
          parcela1_data_prevista?: string | null
          parcela1_status?: string
          parcela1_valor?: number
          parcela2_data_pagamento?: string | null
          parcela2_data_prevista?: string | null
          parcela2_status?: string
          parcela2_valor?: number
          parcela3_data_pagamento?: string | null
          parcela3_data_prevista?: string | null
          parcela3_status?: string
          parcela3_valor?: number
          referencia1_grau?: string | null
          referencia1_nome?: string | null
          referencia1_telefone?: string | null
          referencia2_grau?: string | null
          referencia2_nome?: string | null
          referencia2_telefone?: string | null
          servico?: string
          situacao?: string
          telefone?: string | null
          valor_total?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          account_id: string
          created_at: string
          faixa_nome: string
          id: string
          month: string
          pct_meta: number
          premiacao: number
          service_type: string
          sort_order: number
          vendedor_id: number | null
        }
        Insert: {
          account_id: string
          created_at?: string
          faixa_nome: string
          id?: string
          month: string
          pct_meta: number
          premiacao: number
          service_type?: string
          sort_order: number
          vendedor_id?: number | null
        }
        Update: {
          account_id?: string
          created_at?: string
          faixa_nome?: string
          id?: string
          month?: string
          pct_meta?: number
          premiacao?: number
          service_type?: string
          sort_order?: number
          vendedor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_tiers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_tiers_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          account_id: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      custos_mensais: {
        Row: {
          account_id: string
          categoria: string | null
          created_at: string
          id: string
          mes_referencia: string
          nome: string
          pago: boolean
          tipo: string
          valor: number
        }
        Insert: {
          account_id: string
          categoria?: string | null
          created_at?: string
          id?: string
          mes_referencia: string
          nome: string
          pago?: boolean
          tipo: string
          valor?: number
        }
        Update: {
          account_id?: string
          categoria?: string | null
          created_at?: string
          id?: string
          mes_referencia?: string
          nome?: string
          pago?: boolean
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_mensais_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fichas_rating: {
        Row: {
          account_id: string
          anexo_comprovante: string | null
          anexo_documento: string | null
          anexo_selfie: string | null
          bairro: string | null
          bancos: Json | null
          cep: string | null
          cidade: string | null
          cpf: string
          created_at: string
          data_admissao: string | null
          data_expedicao: string | null
          data_nascimento: string | null
          email: string | null
          empresa: string | null
          empresa_cnpj: string | null
          empresa_nome: string | null
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          faturamento: number | null
          id: string
          imovel1_bairro: string | null
          imovel1_cidade: string | null
          imovel1_localizacao: string | null
          imovel1_tipo: string | null
          imovel1_uf: string | null
          imovel1_valor: number | null
          imovel2_bairro: string | null
          imovel2_cidade: string | null
          imovel2_localizacao: string | null
          imovel2_tipo: string | null
          imovel2_uf: string | null
          imovel2_valor: number | null
          login_serasa: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          possui_empresa: boolean | null
          possui_imovel1: boolean | null
          possui_imovel2: boolean | null
          possui_veiculo: boolean | null
          referencias: Json | null
          renda_familiar: number | null
          rg: string | null
          salario: number | null
          senha_serasa: string | null
          slug: string
          status: string
          tel_celular: string | null
          tel_residencial: string | null
          titulo_eleitor: string | null
          updated_at: string
          veiculo_ano: string | null
          veiculo_estado: string | null
          veiculo_placa: string | null
          veiculo_valor: number | null
        }
        Insert: {
          account_id: string
          anexo_comprovante?: string | null
          anexo_documento?: string | null
          anexo_selfie?: string | null
          bairro?: string | null
          bancos?: Json | null
          cep?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string
          data_admissao?: string | null
          data_expedicao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_cnpj?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          faturamento?: number | null
          id?: string
          imovel1_bairro?: string | null
          imovel1_cidade?: string | null
          imovel1_localizacao?: string | null
          imovel1_tipo?: string | null
          imovel1_uf?: string | null
          imovel1_valor?: number | null
          imovel2_bairro?: string | null
          imovel2_cidade?: string | null
          imovel2_localizacao?: string | null
          imovel2_tipo?: string | null
          imovel2_uf?: string | null
          imovel2_valor?: number | null
          login_serasa?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          possui_empresa?: boolean | null
          possui_imovel1?: boolean | null
          possui_imovel2?: boolean | null
          possui_veiculo?: boolean | null
          referencias?: Json | null
          renda_familiar?: number | null
          rg?: string | null
          salario?: number | null
          senha_serasa?: string | null
          slug: string
          status?: string
          tel_celular?: string | null
          tel_residencial?: string | null
          titulo_eleitor?: string | null
          updated_at?: string
          veiculo_ano?: string | null
          veiculo_estado?: string | null
          veiculo_placa?: string | null
          veiculo_valor?: number | null
        }
        Update: {
          account_id?: string
          anexo_comprovante?: string | null
          anexo_documento?: string | null
          anexo_selfie?: string | null
          bairro?: string | null
          bancos?: Json | null
          cep?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          data_expedicao?: string | null
          data_nascimento?: string | null
          email?: string | null
          empresa?: string | null
          empresa_cnpj?: string | null
          empresa_nome?: string | null
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          faturamento?: number | null
          id?: string
          imovel1_bairro?: string | null
          imovel1_cidade?: string | null
          imovel1_localizacao?: string | null
          imovel1_tipo?: string | null
          imovel1_uf?: string | null
          imovel1_valor?: number | null
          imovel2_bairro?: string | null
          imovel2_cidade?: string | null
          imovel2_localizacao?: string | null
          imovel2_tipo?: string | null
          imovel2_uf?: string | null
          imovel2_valor?: number | null
          login_serasa?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          possui_empresa?: boolean | null
          possui_imovel1?: boolean | null
          possui_imovel2?: boolean | null
          possui_veiculo?: boolean | null
          referencias?: Json | null
          renda_familiar?: number | null
          rg?: string | null
          salario?: number | null
          senha_serasa?: string | null
          slug?: string
          status?: string
          tel_celular?: string | null
          tel_residencial?: string | null
          titulo_eleitor?: string | null
          updated_at?: string
          veiculo_ano?: string | null
          veiculo_estado?: string | null
          veiculo_placa?: string | null
          veiculo_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fichas_rating_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_phases: {
        Row: {
          account_id: string
          ativo: boolean
          created_at: string
          gatilho: string
          id: string
          ordem: number
          phase_n: number
          titulo: string
          trigger_days: number | null
          trigger_ref_phase_n: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          ativo?: boolean
          created_at?: string
          gatilho?: string
          id?: string
          ordem: number
          phase_n: number
          titulo: string
          trigger_days?: number | null
          trigger_ref_phase_n?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          ativo?: boolean
          created_at?: string
          gatilho?: string
          id?: string
          ordem?: number
          phase_n?: number
          titulo?: string
          trigger_days?: number | null
          trigger_ref_phase_n?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_phases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_parceiros: {
        Row: {
          account_id: string
          created_at: string
          data_lista: string
          id: string
          observacoes: string | null
          slug_publico: string
          status_geral: string
          titulo: string
          ultima_atualizacao: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          data_lista?: string
          id?: string
          observacoes?: string | null
          slug_publico?: string
          status_geral?: string
          titulo: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          data_lista?: string
          id?: string
          observacoes?: string | null
          slug_publico?: string
          status_geral?: string
          titulo?: string
          ultima_atualizacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_parceiros_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_parceiros_orgaos: {
        Row: {
          concluidas_data: string | null
          concluidas_hora: string | null
          created_at: string
          descricao: string | null
          id: string
          iniciadas_data: string | null
          iniciadas_hora: string | null
          lista_id: string
          nome: string
          ordem: number
          protocolo_data: string | null
          protocolo_hora: string | null
          recepcionado_data: string | null
          recepcionado_hora: string | null
          status: string
          updated_at: string
        }
        Insert: {
          concluidas_data?: string | null
          concluidas_hora?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          iniciadas_data?: string | null
          iniciadas_hora?: string | null
          lista_id: string
          nome: string
          ordem?: number
          protocolo_data?: string | null
          protocolo_hora?: string | null
          recepcionado_data?: string | null
          recepcionado_hora?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          concluidas_data?: string | null
          concluidas_hora?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          iniciadas_data?: string | null
          iniciadas_hora?: string | null
          lista_id?: string
          nome?: string
          ordem?: number
          protocolo_data?: string | null
          protocolo_hora?: string | null
          recepcionado_data?: string | null
          recepcionado_hora?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listas_parceiros_orgaos_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_accounts: {
        Row: {
          access_token: string
          account_id: string
          ad_account_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          access_token?: string
          account_id: string
          ad_account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          access_token?: string
          account_id?: string
          ad_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_goals: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          key: string
          month: string
          value: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          key: string
          month: string
          value?: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          key?: string
          month?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_entries: {
        Row: {
          account_id: string
          comment: string | null
          created_at: string
          date: string
          id: string
          score: number
        }
        Insert: {
          account_id: string
          comment?: string | null
          created_at?: string
          date?: string
          id?: string
          score: number
        }
        Update: {
          account_id?: string
          comment?: string | null
          created_at?: string
          date?: string
          id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "nps_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      roleta_spins: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          data: string
          hora: string
          id: string
          motivo: string
          motivo_titulo: string
          premio: string
          quantidade_entregue: number
          quantidade_total: number
          status: string
          vendedor: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          data: string
          hora: string
          id?: string
          motivo: string
          motivo_titulo: string
          premio: string
          quantidade_entregue?: number
          quantidade_total?: number
          status?: string
          vendedor: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          hora?: string
          id?: string
          motivo?: string
          motivo_titulo?: string
          premio?: string
          quantidade_entregue?: number
          quantidade_total?: number
          status?: string
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "roleta_spins_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_default: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          account_id: string
          aniversario: string | null
          avatar: string
          cargo: string
          created_at: string
          foto: string | null
          id: number
          inactive_from: string | null
          meta: number
          nome: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          aniversario?: string | null
          avatar?: string
          cargo?: string
          created_at?: string
          foto?: string | null
          id?: number
          inactive_from?: string | null
          meta?: number
          nome: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          aniversario?: string | null
          avatar?: string
          cargo?: string
          created_at?: string
          foto?: string | null
          id?: number
          inactive_from?: string | null
          meta?: number
          nome?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_aliases: {
        Row: {
          account_id: string
          alias: string
          created_at: string
          id: string
          priority: number
          vendedor_id: number
        }
        Insert: {
          account_id: string
          alias: string
          created_at?: string
          id?: string
          priority?: number
          vendedor_id: number
        }
        Update: {
          account_id?: string
          alias?: string
          created_at?: string
          id?: string
          priority?: number
          vendedor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_aliases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_aliases_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_monthly_goals: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          meta: number
          month: string
          service_type: string
          vendedor_id: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          meta?: number
          month: string
          service_type?: string
          vendedor_id: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          meta?: number
          month?: string
          service_type?: string
          vendedor_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_monthly_goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_monthly_goals_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: undefined
      }
      create_app_user: {
        Args: { user_email: string; user_password: string; user_role: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "seller" | "administrativo" | "financeiro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "manager", "seller", "administrativo", "financeiro"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.98.1 (currently installed v2.90.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
