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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      config: {
        Row: {
          cartao_nome: string
          created_at: string
          dia_fechamento: number
          dia_vencimento: number
          renda_centavos: number
          user_id: string
        }
        Insert: {
          cartao_nome?: string
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          renda_centavos?: number
          user_id?: string
        }
        Update: {
          cartao_nome?: string
          created_at?: string
          dia_fechamento?: number
          dia_vencimento?: number
          renda_centavos?: number
          user_id?: string
        }
        Relationships: []
      }
      contas_fixas: {
        Row: {
          ativa: boolean
          created_at: string
          dia: number
          id: string
          nome: string
          user_id: string
          valor_centavos: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          dia?: number
          id?: string
          nome: string
          user_id?: string
          valor_centavos: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          dia?: number
          id?: string
          nome?: string
          user_id?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      dividas: {
        Row: {
          created_at: string
          descricao: string
          direcao: string
          id: string
          mes: string
          pessoa_id: string
          recebido: boolean
          user_id: string
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          descricao: string
          direcao?: string
          id?: string
          mes: string
          pessoa_id: string
          recebido?: boolean
          user_id?: string
          valor_centavos: number
        }
        Update: {
          created_at?: string
          descricao?: string
          direcao?: string
          id?: string
          mes?: string
          pessoa_id?: string
          recebido?: boolean
          user_id?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "dividas_pessoa_id_user_id_fkey"
            columns: ["pessoa_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          categoria: string | null
          created_at: string
          data_compra: string | null
          descricao: string
          dono: string
          id: string
          mes_fatura: string
          parcela: string | null
          recebido: boolean
          user_id: string
          valor_centavos: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_compra?: string | null
          descricao: string
          dono?: string
          id?: string
          mes_fatura: string
          parcela?: string | null
          recebido?: boolean
          user_id?: string
          valor_centavos: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_compra?: string | null
          descricao?: string
          dono?: string
          id?: string
          mes_fatura?: string
          parcela?: string | null
          recebido?: boolean
          user_id?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      metas: {
        Row: {
          alvo_centavos: number
          atual_centavos: number
          created_at: string
          dia: number
          emoji: string
          id: string
          mensal_centavos: number
          nome: string
          prazo: string | null
          user_id: string
        }
        Insert: {
          alvo_centavos: number
          atual_centavos?: number
          created_at?: string
          dia?: number
          emoji?: string
          id?: string
          mensal_centavos?: number
          nome: string
          prazo?: string | null
          user_id?: string
        }
        Update: {
          alvo_centavos?: number
          atual_centavos?: number
          created_at?: string
          dia?: number
          emoji?: string
          id?: string
          mensal_centavos?: number
          nome?: string
          prazo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pagamentos_mes: {
        Row: {
          created_at: string
          id: string
          item_chave: string
          mes: string
          pago: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_chave: string
          mes: string
          pago?: boolean
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_chave?: string
          mes?: string
          pago?: boolean
          user_id?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          apelidos: string[]
          cor: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          apelidos?: string[]
          cor?: string
          created_at?: string
          id?: string
          nome: string
          user_id?: string
        }
        Update: {
          apelidos?: string[]
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      alternar_pagamento: {
        Args: { p_chave: string; p_mes: string }
        Returns: boolean
      }
      apagar_tudo: { Args: never; Returns: undefined }
      importar_fatura: {
        Args: {
          p_dividas: Json
          p_lancamentos: Json
          p_mes: string
          p_renda_centavos?: number
        }
        Returns: Json
      }
      receber_tudo: { Args: { p_pessoa: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
