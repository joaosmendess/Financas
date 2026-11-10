// Tipos do banco no formato do `supabase gen types typescript`.
// Regenere com: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      config: {
        Row: {
          user_id: string
          renda_centavos: number
          cartao_nome: string
          dia_fechamento: number
          dia_vencimento: number
          created_at: string
        }
        Insert: {
          user_id?: string
          renda_centavos?: number
          cartao_nome?: string
          dia_fechamento?: number
          dia_vencimento?: number
          created_at?: string
        }
        Update: {
          user_id?: string
          renda_centavos?: number
          cartao_nome?: string
          dia_fechamento?: number
          dia_vencimento?: number
          created_at?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          id: string
          user_id: string
          nome: string
          cor: string
          apelidos: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          nome: string
          cor?: string
          apelidos?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          cor?: string
          apelidos?: string[]
          created_at?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          id: string
          user_id: string
          mes_fatura: string
          data_compra: string | null
          descricao: string
          valor_centavos: number
          parcela: string | null
          categoria: string | null
          dono: string
          recebido: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          mes_fatura: string
          data_compra?: string | null
          descricao: string
          valor_centavos: number
          parcela?: string | null
          categoria?: string | null
          dono?: string
          recebido?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mes_fatura?: string
          data_compra?: string | null
          descricao?: string
          valor_centavos?: number
          parcela?: string | null
          categoria?: string | null
          dono?: string
          recebido?: boolean
          created_at?: string
        }
        Relationships: []
      }
      contas_fixas: {
        Row: {
          id: string
          user_id: string
          nome: string
          valor_centavos: number
          dia: number
          ativa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          nome: string
          valor_centavos: number
          dia?: number
          ativa?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          valor_centavos?: number
          dia?: number
          ativa?: boolean
          created_at?: string
        }
        Relationships: []
      }
      dividas: {
        Row: {
          id: string
          user_id: string
          pessoa_id: string
          descricao: string
          valor_centavos: number
          mes: string
          recebido: boolean
          direcao: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          pessoa_id: string
          descricao: string
          valor_centavos: number
          mes: string
          recebido?: boolean
          direcao?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pessoa_id?: string
          descricao?: string
          valor_centavos?: number
          mes?: string
          recebido?: boolean
          direcao?: string
          created_at?: string
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
      metas: {
        Row: {
          id: string
          user_id: string
          emoji: string
          nome: string
          alvo_centavos: number
          atual_centavos: number
          mensal_centavos: number
          prazo: string | null
          dia: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          emoji?: string
          nome: string
          alvo_centavos: number
          atual_centavos?: number
          mensal_centavos?: number
          prazo?: string | null
          dia?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          emoji?: string
          nome?: string
          alvo_centavos?: number
          atual_centavos?: number
          mensal_centavos?: number
          prazo?: string | null
          dia?: number
          created_at?: string
        }
        Relationships: []
      }
      pagamentos_mes: {
        Row: {
          id: string
          user_id: string
          mes: string
          item_chave: string
          pago: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          mes: string
          item_chave: string
          pago?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mes?: string
          item_chave?: string
          pago?: boolean
          created_at?: string
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
      apagar_tudo: {
        Args: never
        Returns: undefined
      }
      importar_fatura: {
        Args: {
          p_dividas: Json
          p_lancamentos: Json
          p_mes: string
          p_renda_centavos?: number
        }
        Returns: Json
      }
      receber_tudo: {
        Args: { p_pessoa: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
