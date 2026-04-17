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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      casos: {
        Row: {
          atualizado_em: string
          bacen: Json
          cliente_id: string | null
          codigo: string
          contrato: Json
          criado_em: string
          etapa_atual: number
          id: string
          simulacao: Json
          status: string
          tarifas: Json
          user_id: string | null
        }
        Insert: {
          atualizado_em?: string
          bacen?: Json
          cliente_id?: string | null
          codigo?: string
          contrato?: Json
          criado_em?: string
          etapa_atual?: number
          id?: string
          simulacao?: Json
          status?: string
          tarifas?: Json
          user_id?: string | null
        }
        Update: {
          atualizado_em?: string
          bacen?: Json
          cliente_id?: string | null
          codigo?: string
          contrato?: Json
          criado_em?: string
          etapa_atual?: number
          id?: string
          simulacao?: Json
          status?: string
          tarifas?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          atualizado_em: string | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          criado_em: string | null
          data_nascimento: string | null
          documentos: Json | null
          email: string | null
          endereco: string | null
          estado_civil: string | null
          id: string
          nacionalidade: string | null
          nome: string
          observacoes: string | null
          profissao: string | null
          rg: string | null
          telefone: string | null
          uf: string | null
          user_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          observacoes?: string | null
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
          uf?: string | null
          user_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          documentos?: Json | null
          email?: string | null
          endereco?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          observacoes?: string | null
          profissao?: string | null
          rg?: string | null
          telefone?: string | null
          uf?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contratos_financeiros: {
        Row: {
          atualizado_em: string
          caso_id: string | null
          cliente_id: string | null
          criado_em: string
          data_inicio: string
          descricao: string
          id: string
          numero_parcelas: number
          observacoes: string | null
          primeiro_vencimento: string
          saldo_devedor: number
          status: string
          user_id: string
          valor_pago: number
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          caso_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_inicio?: string
          descricao?: string
          id?: string
          numero_parcelas?: number
          observacoes?: string | null
          primeiro_vencimento?: string
          saldo_devedor?: number
          status?: string
          user_id?: string
          valor_pago?: number
          valor_parcela?: number
          valor_total?: number
        }
        Update: {
          atualizado_em?: string
          caso_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_inicio?: string
          descricao?: string
          id?: string
          numero_parcelas?: number
          observacoes?: string | null
          primeiro_vencimento?: string
          saldo_devedor?: number
          status?: string
          user_id?: string
          valor_pago?: number
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_financeiros_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_caso: {
        Row: {
          caso_id: string
          conteudo: string
          criado_em: string
          id: string
          metadata: Json
          tipo: string
          titulo: string
          user_id: string | null
          versao: number
        }
        Insert: {
          caso_id: string
          conteudo?: string
          criado_em?: string
          id?: string
          metadata?: Json
          tipo?: string
          titulo?: string
          user_id?: string | null
          versao?: number
        }
        Update: {
          caso_id?: string
          conteudo?: string
          criado_em?: string
          id?: string
          metadata?: Json
          tipo?: string
          titulo?: string
          user_id?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_caso_caso_id_fkey"
            columns: ["caso_id"]
            isOneToOne: false
            referencedRelation: "casos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos: {
        Row: {
          atualizado_em: string
          categoria: string | null
          cliente_id: string | null
          comprovante_url: string | null
          contrato_id: string | null
          criado_em: string
          data: string
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          parcela_id: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          contrato_id?: string | null
          criado_em?: string
          data?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          parcela_id?: string | null
          tipo: string
          user_id?: string
          valor?: number
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          contrato_id?: string | null
          criado_em?: string
          data?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          parcela_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          atualizado_em: string
          contrato_id: string
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          numero: number
          observacoes: string | null
          status: string
          user_id: string
          valor: number
          valor_pago: number
        }
        Insert: {
          atualizado_em?: string
          contrato_id: string
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          numero: number
          observacoes?: string | null
          status?: string
          user_id?: string
          valor?: number
          valor_pago?: number
        }
        Update: {
          atualizado_em?: string
          contrato_id?: string
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          numero?: number
          observacoes?: string | null
          status?: string
          user_id?: string
          valor?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          atualizado_em: string | null
          conteudo: string
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          conteudo?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string
          user_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          conteudo?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "advogado" | "operador"
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
      app_role: ["admin", "advogado", "operador"],
    },
  },
} as const
