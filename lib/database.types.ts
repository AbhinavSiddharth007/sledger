export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      costs: {
        Row: {
          amount_cents: number;
          category: string;
          cost_date: string;
          created_at: string;
          description: string;
          id: string;
          project_id: string;
          source: string;
          status: string;
          supplier: string;
          vat_cents: number;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          category: string;
          cost_date: string;
          created_at?: string;
          description: string;
          id?: string;
          project_id: string;
          source: string;
          status?: string;
          supplier: string;
          vat_cents?: number;
        };
        Update: {
          amount_cents?: number;
          category?: string;
          cost_date?: string;
          created_at?: string;
          description?: string;
          id?: string;
          project_id?: string;
          source?: string;
          status?: string;
          supplier?: string;
          vat_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "costs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          confidence: number | null;
          content_hash: string | null;
          created_at: string;
          file_url: string;
          id: string;
          project_id: string;
          raw_extraction: Json | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          confidence?: number | null;
          content_hash?: string | null;
          created_at?: string;
          file_url: string;
          id?: string;
          project_id: string;
          raw_extraction?: Json | null;
          status?: string;
        };
        Update: {
          confidence?: number | null;
          content_hash?: string | null;
          created_at?: string;
          file_url?: string;
          id?: string;
          project_id?: string;
          raw_extraction?: Json | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_cents: number;
          created_at: string;
          due_at: string;
          id: string;
          issued_at: string;
          number: string;
          project_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          due_at: string;
          id?: string;
          issued_at: string;
          number: string;
          project_id: string;
          status?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          due_at?: string;
          id?: string;
          issued_at?: string;
          number?: string;
          project_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget_cents: number;
          client_name: string;
          created_at: string;
          id: string;
          name: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          budget_cents: number;
          client_name: string;
          created_at?: string;
          id?: string;
          name: string;
          status?: string;
        };
        Update: {
          budget_cents?: number;
          client_name?: string;
          created_at?: string;
          id?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_receipt: {
        Args: {
          p_amount_cents: number;
          p_category: string;
          p_cost_date: string;
          p_description: string;
          p_document_id: string;
          p_project_id: string;
          p_status: string;
          p_supplier: string;
          p_vat_cents: number;
        };
        Returns: string;
      };
      record_extraction: {
        Args: {
          p_confidence?: number;
          p_document_id: string;
          p_project_id: string;
          p_raw_extraction: Json;
          p_status?: string;
        };
        Returns: boolean;
      };
      start_document: {
        Args: { p_content_hash: string; p_file_url: string; p_project_id: string };
        Returns: {
          created: boolean;
          document_id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
