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
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          created_at?: string
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
      clientes: {
        Row: {
          account_id: string
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
          parcela1_status: string
          parcela1_valor: number
          parcela2_data_pagamento: string | null
          parcela2_status: string
          parcela2_valor: number
          parcela3_data_pagamento: string | null
          parcela3_status: string
          parcela3_valor: number
          servico: string
          situacao: string
          telefone: string | null
          valor_total: number
          vendedor: string
        }
        Insert: {
          account_id: string
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
          parcela1_status?: string
          parcela1_valor?: number
          parcela2_data_pagamento?: string | null
          parcela2_status?: string
          parcela2_valor?: number
          parcela3_data_pagamento?: string | null
          parcela3_status?: string
          parcela3_valor?: number
          servico?: string
          situacao?: string
          telefone?: string | null
          valor_total?: number
          vendedor: string
        }
        Update: {
          account_id?: string
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
          parcela1_status?: string
          parcela1_valor?: number
          parcela2_data_pagamento?: string | null
          parcela2_status?: string
          parcela2_valor?: number
          parcela3_data_pagamento?: string | null
          parcela3_status?: string
          parcela3_valor?: number
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
      user_accounts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          role: Database["public"]["Enums"]["app_role"]
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          role?: Database["public"]["Enums"]["app_role"]
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          is_default?: boolean
          created_at?: string
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
          avatar: string
          cargo: string
          created_at: string
          id: number
          meta: number
          nome: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          avatar?: string
          cargo?: string
          created_at?: string
          id?: number
          meta?: number
          nome: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          avatar?: string
          cargo?: string
          created_at?: string
          id?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
  public: {
    Enums: {
      app_role: ["admin", "manager", "seller", "administrativo", "financeiro"],
    },
  },
} as const
