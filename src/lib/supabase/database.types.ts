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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      bill_items: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          id: string
          item_name: string
          position: number
        }
        Insert: {
          amount?: number
          bill_id: string
          created_at?: string
          id?: string
          item_name: string
          position?: number
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          id?: string
          item_name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_status_logs: {
        Row: {
          bill_id: string
          changed_at: string
          id: string
          new_status: string
          old_status: string | null
          reason: string
        }
        Insert: {
          bill_id: string
          changed_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          reason: string
        }
        Update: {
          bill_id?: string
          changed_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_status_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_status_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_settings: {
        Row: {
          electricity_rate: number
          id: string
          updated_at: string
          water_rate_per_person: number
        }
        Insert: {
          electricity_rate?: number
          id?: string
          updated_at?: string
          water_rate_per_person?: number
        }
        Update: {
          electricity_rate?: number
          id?: string
          updated_at?: string
          water_rate_per_person?: number
        }
        Relationships: []
      }
      bills: {
        Row: {
          billing_month: number
          billing_year: number
          created_at: string
          current_meter: number | null
          due_date: string | null
          electricity_amount: number
          electricity_rate: number
          electricity_units: number
          id: string
          issued_at: string | null
          occupant_count: number
          other_amount: number
          other_note: string | null
          paid_at: string | null
          previous_meter: number | null
          public_token: string
          rent_amount: number
          room_id: string
          slip_content_type: string | null
          slip_original_name: string | null
          slip_path: string | null
          slip_preview_path: string | null
          slip_size_bytes: number | null
          slip_submitted_at: string | null
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
          water_amount: number
          water_rate_per_person: number
        }
        Insert: {
          billing_month: number
          billing_year: number
          created_at?: string
          current_meter?: number | null
          due_date?: string | null
          electricity_amount?: number
          electricity_rate?: number
          electricity_units?: number
          id?: string
          issued_at?: string | null
          occupant_count?: number
          other_amount?: number
          other_note?: string | null
          paid_at?: string | null
          previous_meter?: number | null
          public_token?: string
          rent_amount?: number
          room_id: string
          slip_content_type?: string | null
          slip_original_name?: string | null
          slip_path?: string | null
          slip_preview_path?: string | null
          slip_size_bytes?: number | null
          slip_submitted_at?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          water_amount?: number
          water_rate_per_person?: number
        }
        Update: {
          billing_month?: number
          billing_year?: number
          created_at?: string
          current_meter?: number | null
          due_date?: string | null
          electricity_amount?: number
          electricity_rate?: number
          electricity_units?: number
          id?: string
          issued_at?: string | null
          occupant_count?: number
          other_amount?: number
          other_note?: string | null
          paid_at?: string | null
          previous_meter?: number | null
          public_token?: string
          rent_amount?: number
          room_id?: string
          slip_content_type?: string | null
          slip_original_name?: string | null
          slip_path?: string | null
          slip_preview_path?: string | null
          slip_size_bytes?: number | null
          slip_submitted_at?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
          water_amount?: number
          water_rate_per_person?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contract_end: string | null
          contract_start: string | null
          created_at: string
          deposit_amount: number | null
          file_path: string | null
          id: string
          note: string | null
          original_file_name: string | null
          room_id: string | null
          tenant_id: string
        }
        Insert: {
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          deposit_amount?: number | null
          file_path?: string | null
          id?: string
          note?: string | null
          original_file_name?: string | null
          room_id?: string | null
          tenant_id: string
        }
        Update: {
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          deposit_amount?: number | null
          file_path?: string | null
          id?: string
          note?: string | null
          original_file_name?: string | null
          room_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          billing_month: number | null
          billing_year: number | null
          category: string
          created_at: string
          expense_date: string
          id: string
          note: string | null
          receipt_path: string | null
        }
        Insert: {
          amount: number
          billing_month?: number | null
          billing_year?: number | null
          category: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          receipt_path?: string | null
        }
        Update: {
          amount?: number
          billing_month?: number | null
          billing_year?: number | null
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          receipt_path?: string | null
        }
        Relationships: []
      }
      homepage_rooms: {
        Row: {
          cover_image_position_x: number
          cover_image_position_y: number
          cover_image_url: string | null
          cover_image_zoom: number
          description: string
          image_urls: string[]
          monthly_price: number
          room_code: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_position_x?: number
          cover_image_position_y?: number
          cover_image_url?: string | null
          cover_image_zoom?: number
          description: string
          image_urls?: string[]
          monthly_price?: number
          room_code: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_position_x?: number
          cover_image_position_y?: number
          cover_image_url?: string | null
          cover_image_zoom?: number
          description?: string
          image_urls?: string[]
          monthly_price?: number
          room_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_settings: {
        Row: {
          banner_badge: string
          banner_description: string
          banner_highlight: string
          banner_image_position_x: number
          banner_image_position_y: number
          banner_image_url: string | null
          banner_image_zoom: number
          banner_title: string
          contact_description: string
          contact_title: string
          facebook_url: string
          gallery_description: string
          gallery_items: Json
          gallery_title: string
          id: string
          line_id: string
          line_url: string
          location_description: string
          location_title: string
          map_url: string
          nearby_description: string
          nearby_place: string
          nearby_places: string[]
          phone_primary: string
          phone_secondary: string
          updated_at: string
        }
        Insert: {
          banner_badge?: string
          banner_description?: string
          banner_highlight?: string
          banner_image_position_x?: number
          banner_image_position_y?: number
          banner_image_url?: string | null
          banner_image_zoom?: number
          banner_title?: string
          contact_description?: string
          contact_title?: string
          facebook_url?: string
          gallery_description?: string
          gallery_items?: Json
          gallery_title?: string
          id?: string
          line_id?: string
          line_url?: string
          location_description?: string
          location_title?: string
          map_url?: string
          nearby_description?: string
          nearby_place?: string
          nearby_places?: string[]
          phone_primary?: string
          phone_secondary?: string
          updated_at?: string
        }
        Update: {
          banner_badge?: string
          banner_description?: string
          banner_highlight?: string
          banner_image_position_x?: number
          banner_image_position_y?: number
          banner_image_url?: string | null
          banner_image_zoom?: number
          banner_title?: string
          contact_description?: string
          contact_title?: string
          facebook_url?: string
          gallery_description?: string
          gallery_items?: Json
          gallery_title?: string
          id?: string
          line_id?: string
          line_url?: string
          location_description?: string
          location_title?: string
          map_url?: string
          nearby_description?: string
          nearby_place?: string
          nearby_places?: string[]
          phone_primary?: string
          phone_secondary?: string
          updated_at?: string
        }
        Relationships: []
      }
      line_link_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          tenant_id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          tenant_id: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "line_link_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      line_notification_logs: {
        Row: {
          bill_id: string
          id: string
          notification_type: string
          sent_at: string
        }
        Insert: {
          bill_id: string
          id?: string
          notification_type: string
          sent_at?: string
        }
        Update: {
          bill_id?: string
          id?: string
          notification_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_notification_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_notification_logs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_checks: {
        Row: {
          check_date: string
          created_at: string
          disc_reading: number
          id: string
          note: string | null
          room_id: string
        }
        Insert: {
          check_date: string
          created_at?: string
          disc_reading: number
          id?: string
          note?: string | null
          room_id: string
        }
        Update: {
          check_date?: string
          created_at?: string
          disc_reading?: number
          id?: string
          note?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_checks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_daily_usage: {
        Row: {
          created_at: string
          end_total_kwh: number | null
          kwh: number | null
          note: string | null
          room_id: string
          source: string
          updated_at: string
          usage_date: string
        }
        Insert: {
          created_at?: string
          end_total_kwh?: number | null
          kwh?: number | null
          note?: string | null
          room_id: string
          source: string
          updated_at?: string
          usage_date: string
        }
        Update: {
          created_at?: string
          end_total_kwh?: number | null
          kwh?: number | null
          note?: string | null
          room_id?: string
          source?: string
          updated_at?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_daily_usage_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      move_out_settlements: {
        Row: {
          closed_at: string | null
          created_at: string
          deposit_amount: number
          electricity_amount: number
          final_electricity_meter: number | null
          id: string
          items: Json
          items_amount: number
          note: string | null
          outstanding_bills_amount: number
          refund_amount: number
          refund_reference: string | null
          refund_slip_path: string | null
          refunded_on: string | null
          room_id: string | null
          status: string
          tenant_id: string
          total_deductions: number
          updated_at: string
          water_amount: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          deposit_amount: number
          electricity_amount?: number
          final_electricity_meter?: number | null
          id?: string
          items?: Json
          items_amount?: number
          note?: string | null
          outstanding_bills_amount?: number
          refund_amount: number
          refund_reference?: string | null
          refund_slip_path?: string | null
          refunded_on?: string | null
          room_id?: string | null
          status?: string
          tenant_id: string
          total_deductions: number
          updated_at?: string
          water_amount?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          deposit_amount?: number
          electricity_amount?: number
          final_electricity_meter?: number | null
          id?: string
          items?: Json
          items_amount?: number
          note?: string | null
          outstanding_bills_amount?: number
          refund_amount?: number
          refund_reference?: string | null
          refund_slip_path?: string | null
          refunded_on?: string | null
          room_id?: string | null
          status?: string
          tenant_id?: string
          total_deductions?: number
          updated_at?: string
          water_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "move_out_settlements_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "move_out_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          amount_match: boolean | null
          bill_id: string
          created_at: string
          duplicate_check: boolean | null
          id: string
          original_file_name: string | null
          receiver_account: string | null
          receiver_bank: string | null
          receiver_match: boolean | null
          receiver_name: string | null
          rejected_reason: string | null
          sender_bank: string | null
          sender_name: string | null
          slip_path: string | null
          transaction_ref: string | null
          transfer_date: string | null
          transfer_time: string | null
          verification_provider: string | null
          verification_response: Json | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          amount?: number | null
          amount_match?: boolean | null
          bill_id: string
          created_at?: string
          duplicate_check?: boolean | null
          id?: string
          original_file_name?: string | null
          receiver_account?: string | null
          receiver_bank?: string | null
          receiver_match?: boolean | null
          receiver_name?: string | null
          rejected_reason?: string | null
          sender_bank?: string | null
          sender_name?: string | null
          slip_path?: string | null
          transaction_ref?: string | null
          transfer_date?: string | null
          transfer_time?: string | null
          verification_provider?: string | null
          verification_response?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          amount?: number | null
          amount_match?: boolean | null
          bill_id?: string
          created_at?: string
          duplicate_check?: boolean | null
          id?: string
          original_file_name?: string | null
          receiver_account?: string | null
          receiver_bank?: string | null
          receiver_match?: boolean | null
          receiver_name?: string | null
          rejected_reason?: string | null
          sender_bank?: string | null
          sender_name?: string | null
          slip_path?: string | null
          transaction_ref?: string | null
          transfer_date?: string | null
          transfer_time?: string | null
          verification_provider?: string | null
          verification_response?: Json | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          monthly_rent: number
          note: string | null
          occupant_count: number
          room_code: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_rent?: number
          note?: string | null
          occupant_count?: number
          room_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_rent?: number
          note?: string | null
          occupant_count?: number
          room_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      slip_upload_attempts: {
        Row: {
          bill_id: string
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "slip_upload_attempts_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slip_upload_attempts_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          advance_rent_amount: number | null
          created_at: string
          deposit_amount: number | null
          email: string | null
          full_name: string
          id: string
          initial_electricity_meter: number | null
          is_active: boolean
          line_linked_at: string | null
          line_user_id: string | null
          move_in_date: string | null
          move_out_date: string | null
          note: string | null
          phone: string | null
          planned_move_out_date: string | null
          rent_waived_month: number | null
          rent_waived_year: number | null
          room_id: string | null
          termination_notice_date: string | null
          updated_at: string
        }
        Insert: {
          advance_rent_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          email?: string | null
          full_name: string
          id?: string
          initial_electricity_meter?: number | null
          is_active?: boolean
          line_linked_at?: string | null
          line_user_id?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          note?: string | null
          phone?: string | null
          planned_move_out_date?: string | null
          rent_waived_month?: number | null
          rent_waived_year?: number | null
          room_id?: string | null
          termination_notice_date?: string | null
          updated_at?: string
        }
        Update: {
          advance_rent_amount?: number | null
          created_at?: string
          deposit_amount?: number | null
          email?: string | null
          full_name?: string
          id?: string
          initial_electricity_meter?: number | null
          is_active?: boolean
          line_linked_at?: string | null
          line_user_id?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          note?: string | null
          phone?: string | null
          planned_move_out_date?: string | null
          rent_waived_month?: number | null
          rent_waived_year?: number | null
          room_id?: string | null
          termination_notice_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bill_summary: {
        Row: {
          billing_month: number | null
          billing_year: number | null
          created_at: string | null
          current_meter: number | null
          due_date: string | null
          electricity_amount: number | null
          electricity_rate: number | null
          electricity_units: number | null
          id: string | null
          occupant_count: number | null
          other_amount: number | null
          paid_at: string | null
          previous_meter: number | null
          public_token: string | null
          rent_amount: number | null
          room_code: string | null
          status: string | null
          total_amount: number | null
          water_amount: number | null
          water_rate_per_person: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_tenant_move_out: { Args: { p_tenant_id: string }; Returns: Json }
      check_slip_upload_rate: {
        Args: {
          p_bill_id: string
          p_ip_hash: string
          p_max_per_bill?: number
          p_max_per_ip?: number
          p_window?: string
        }
        Returns: boolean
      }
      claim_line_link_code: {
        Args: { p_code_hash: string; p_line_user_id: string }
        Returns: Json
      }
      close_move_out_settlement: {
        Args: {
          p_expected_refund: number
          p_reference: string
          p_refunded_on: string
          p_slip_path: string
          p_tenant_id: string
        }
        Returns: Json
      }
      complete_tenant_move_out: {
        Args: { p_move_out_date: string; p_tenant_id: string }
        Returns: Json
      }
      create_bill_with_items: {
        Args: {
          p_billing_month: number
          p_billing_year: number
          p_current_meter: number
          p_due_date: string
          p_electricity_amount: number
          p_electricity_rate: number
          p_electricity_units: number
          p_items?: Json
          p_occupant_count: number
          p_other_amount: number
          p_previous_meter: number
          p_rent_amount: number
          p_room_id: string
          p_tenant_id: string
          p_total_amount: number
          p_water_amount: number
          p_water_rate_per_person: number
        }
        Returns: string
      }
      create_tenant_with_room: {
        Args: {
          p_advance_rent_amount: number
          p_contract_file_path: string
          p_contract_original_name: string
          p_deposit_amount: number
          p_full_name: string
          p_initial_electricity_meter: number
          p_monthly_rent: number
          p_move_in_date: string
          p_note: string
          p_occupant_count: number
          p_phone: string
          p_room_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      delete_meter_usage: {
        Args: { p_room_id: string; p_usage_date: string }
        Returns: Json
      }
      get_public_bill: { Args: { p_token: string }; Returns: Json }
      record_meter_total: {
        Args: { p_room_id: string; p_total_kwh: number; p_usage_date: string }
        Returns: Json
      }
      reopen_move_out_settlement: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      save_manual_meter_usage: {
        Args: {
          p_kwh: number
          p_note: string
          p_room_id: string
          p_usage_date: string
        }
        Returns: Json
      }
      save_move_out_settlement: {
        Args: {
          p_electricity_amount: number
          p_final_electricity_meter: number
          p_items: Json
          p_note: string
          p_tenant_id: string
          p_water_amount: number
        }
        Returns: Json
      }
      set_tenant_move_out_notice: {
        Args: {
          p_move_out_date: string
          p_notice_date: string
          p_tenant_id: string
        }
        Returns: Json
      }
      tenant_outstanding_bills: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      update_bill_status: {
        Args: { p_bill_id: string; p_new_status: string; p_reason: string }
        Returns: {
          billing_month: number
          billing_year: number
          created_at: string
          current_meter: number | null
          due_date: string | null
          electricity_amount: number
          electricity_rate: number
          electricity_units: number
          id: string
          issued_at: string | null
          occupant_count: number
          other_amount: number
          other_note: string | null
          paid_at: string | null
          previous_meter: number | null
          public_token: string
          rent_amount: number
          room_id: string
          slip_content_type: string | null
          slip_original_name: string | null
          slip_path: string | null
          slip_preview_path: string | null
          slip_size_bytes: number | null
          slip_submitted_at: string | null
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
          water_amount: number
          water_rate_per_person: number
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      use_tuya_meter_usage: {
        Args: { p_room_id: string; p_usage_date: string }
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
