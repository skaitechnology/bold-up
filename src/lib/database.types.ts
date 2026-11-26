
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"meta": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never,"meta"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never,"meta"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_exceptions": {
                  Row: {
                    "coach_id": string,"ends_on": string,"id": string,"reason": string | null,"starts_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"ends_on": string,"id"?: string,"reason"?: string | null,"starts_on": string
                  }
                  Update: {
                    "coach_id"?: string,"ends_on"?: string,"id"?: string,"reason"?: string | null,"starts_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_exceptions_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_rules": {
                  Row: {
                    "coach_id": string,"end_time": string,"id": string,"start_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"end_time": string,"id"?: string,"start_time": string,"weekday": number
                  }
                  Update: {
                    "coach_id"?: string,"end_time"?: string,"id"?: string,"start_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_rules_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "cancelled_by": string | null,"coach_id": string,"created_at": string,"customer_id": string,"decided_at": string | null,"duration_min": number,"ends_at": string,"id": string,"is_demo": boolean,"location_kind": string,"location_note": string | null,"message": string | null,"price_cents": number,"service_id": string | null,"service_name": string,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_by"?: string | null,"coach_id": string,"created_at"?: string,"customer_id": string,"decided_at"?: string | null,"duration_min": number,"ends_at": string,"id"?: string,"is_demo"?: boolean,"location_kind"?: string,"location_note"?: string | null,"message"?: string | null,"price_cents": number,"service_id"?: string | null,"service_name": string,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Update: {
                    "cancelled_by"?: string | null,"coach_id"?: string,"created_at"?: string,"customer_id"?: string,"decided_at"?: string | null,"duration_min"?: number,"ends_at"?: string,"id"?: string,"is_demo"?: boolean,"location_kind"?: string,"location_note"?: string | null,"message"?: string | null,"price_cents"?: number,"service_id"?: string | null,"service_name"?: string,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_service_id_fkey"
      columns: ["service_id"]
isOneToOne: false
      referencedRelation: "coach_services"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_documents": {
                  Row: {
                    "coach_id": string,"created_at": string,"expires_on": string | null,"file_name": string,"id": string,"is_demo": boolean,"mime_type": string,"precheck": Json | null,"reference": string | null,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"size_bytes": number,"status": Database["public"]['Enums']["document_status"],"storage_path": string,"type_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"expires_on"?: string | null,"file_name": string,"id"?: string,"is_demo"?: boolean,"mime_type": string,"precheck"?: Json | null,"reference"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes": number,"status"?: Database["public"]['Enums']["document_status"],"storage_path": string,"type_code": string,"updated_at"?: string
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"expires_on"?: string | null,"file_name"?: string,"id"?: string,"is_demo"?: boolean,"mime_type"?: string,"precheck"?: Json | null,"reference"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"size_bytes"?: number,"status"?: Database["public"]['Enums']["document_status"],"storage_path"?: string,"type_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_documents_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_documents_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_documents_type_code_fkey"
      columns: ["type_code"]
isOneToOne: false
      referencedRelation: "document_types"
      referencedColumns: ["code"]
    }
                  ]
                },"coach_media": {
                  Row: {
                    "coach_id": string,"created_at": string,"id": string,"path": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"id"?: string,"path": string,"sort_order"?: number
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"id"?: string,"path"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_media_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_profiles": {
                  Row: {
                    "accepting_bookings": boolean,"at_gym": boolean,"at_home": boolean,"bio": string,"city": string | null,"created_at": string,"display_name": string,"experience": string,"formats": (string)[],"headline": string,"id": string,"instagram": string | null,"is_demo": boolean,"is_published": boolean,"lat": number | null,"levels": (string)[],"lng": number | null,"min_notice_hours": number,"online": boolean,"outdoor": boolean,"photo_path": string | null,"postal_code": string | null,"review_note": string | null,"service_radius_km": number,"slot_step_min": number,"slug": string,"submitted_at": string | null,"training_school": string | null,"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"verified_at": string | null,"verified_by": string | null,"website": string | null,"years_experience": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepting_bookings"?: boolean,"at_gym"?: boolean,"at_home"?: boolean,"bio"?: string,"city"?: string | null,"created_at"?: string,"display_name"?: string,"experience"?: string,"formats"?: (string)[],"headline"?: string,"id": string,"instagram"?: string | null,"is_demo"?: boolean,"is_published"?: boolean,"lat"?: number | null,"levels"?: (string)[],"lng"?: number | null,"min_notice_hours"?: number,"online"?: boolean,"outdoor"?: boolean,"photo_path"?: string | null,"postal_code"?: string | null,"review_note"?: string | null,"service_radius_km"?: number,"slot_step_min"?: number,"slug": string,"submitted_at"?: string | null,"training_school"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null,"years_experience"?: number | null
                  }
                  Update: {
                    "accepting_bookings"?: boolean,"at_gym"?: boolean,"at_home"?: boolean,"bio"?: string,"city"?: string | null,"created_at"?: string,"display_name"?: string,"experience"?: string,"formats"?: (string)[],"headline"?: string,"id"?: string,"instagram"?: string | null,"is_demo"?: boolean,"is_published"?: boolean,"lat"?: number | null,"levels"?: (string)[],"lng"?: number | null,"min_notice_hours"?: number,"online"?: boolean,"outdoor"?: boolean,"photo_path"?: string | null,"postal_code"?: string | null,"review_note"?: string | null,"service_radius_km"?: number,"slot_step_min"?: number,"slug"?: string,"submitted_at"?: string | null,"training_school"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"verified_at"?: string | null,"verified_by"?: string | null,"website"?: string | null,"years_experience"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_profiles_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_profiles_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_profiles_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_profiles_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_qualifications": {
                  Row: {
                    "coach_id": string,"created_at": string,"id": string,"issuer": string | null,"kind": string,"status": string,"title": string,"year_obtained": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"id"?: string,"issuer"?: string | null,"kind": string,"status"?: string,"title": string,"year_obtained"?: number | null
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"id"?: string,"issuer"?: string | null,"kind"?: string,"status"?: string,"title"?: string,"year_obtained"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_qualifications_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_services": {
                  Row: {
                    "coach_id": string,"created_at": string,"description": string,"duration_min": number,"format": string,"id": string,"is_active": boolean,"name": string,"price_cents": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"description"?: string,"duration_min": number,"format"?: string,"id"?: string,"is_active"?: boolean,"name": string,"price_cents": number,"sort_order"?: number
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"description"?: string,"duration_min"?: number,"format"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"price_cents"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_services_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_sports": {
                  Row: {
                    "coach_id": string,"sport_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"sport_id": string
                  }
                  Update: {
                    "coach_id"?: string,"sport_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_sports_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_sports_sport_id_fkey"
      columns: ["sport_id"]
isOneToOne: false
      referencedRelation: "sports"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "coach_id": string,"created_at": string,"customer_id": string,"id": string,"last_message_at": string | null,"last_message_preview": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"customer_id": string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"customer_id"?: string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"document_types": {
                  Row: {
                    "code": string,"has_expiry": boolean,"hint_en": string,"hint_fr": string,"is_required": boolean,"name_en": string,"name_fr": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"has_expiry"?: boolean,"hint_en"?: string,"hint_fr"?: string,"is_required"?: boolean,"name_en": string,"name_fr": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"has_expiry"?: boolean,"hint_en"?: string,"hint_fr"?: string,"is_required"?: boolean,"name_en"?: string,"name_fr"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"events": {
                  Row: {
                    "address": string | null,"city": string | null,"created_at": string,"description": string,"ends_on": string | null,"formats": (string)[],"id": string,"is_demo": boolean,"is_free": boolean,"is_published": boolean,"kind": string,"lat": number,"level": string,"lng": number,"name": string,"organizer": string | null,"photo_path": string | null,"place_name": string | null,"postal_code": string | null,"price_from_cents": number | null,"slug": string,"source": string,"sport_slug": string | null,"start_time": string | null,"starts_on": string,"summary": string,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"formats"?: (string)[],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"is_published"?: boolean,"kind": string,"lat": number,"level"?: string,"lng": number,"name": string,"organizer"?: string | null,"photo_path"?: string | null,"place_name"?: string | null,"postal_code"?: string | null,"price_from_cents"?: number | null,"slug": string,"source"?: string,"sport_slug"?: string | null,"start_time"?: string | null,"starts_on": string,"summary"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"description"?: string,"ends_on"?: string | null,"formats"?: (string)[],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"is_published"?: boolean,"kind"?: string,"lat"?: number,"level"?: string,"lng"?: number,"name"?: string,"organizer"?: string | null,"photo_path"?: string | null,"place_name"?: string | null,"postal_code"?: string | null,"price_from_cents"?: number | null,"slug"?: string,"source"?: string,"sport_slug"?: string | null,"start_time"?: string | null,"starts_on"?: string,"summary"?: string,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"favorites": {
                  Row: {
                    "coach_id": string,"created_at": string,"customer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coach_id": string,"created_at"?: string,"customer_id": string
                  }
                  Update: {
                    "coach_id"?: string,"created_at"?: string,"customer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": number,"read_at": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: never,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: never,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"data": NonNullable<Json>,"id": number,"kind": string,"link": string | null,"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"kind": string,"link"?: string | null,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "city": string | null,"created_at": string,"deletion_requested_at": string | null,"email": string,"favorite_sports": (string)[],"full_name": string,"goal": string | null,"id": string,"is_demo": boolean,"is_suspended": boolean,"level": string | null,"locale": string,"phone": string | null,"postal_code": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"deletion_requested_at"?: string | null,"email": string,"favorite_sports"?: (string)[],"full_name"?: string,"goal"?: string | null,"id": string,"is_demo"?: boolean,"is_suspended"?: boolean,"level"?: string | null,"locale"?: string,"phone"?: string | null,"postal_code"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string,"favorite_sports"?: (string)[],"full_name"?: string,"goal"?: string | null,"id"?: string,"is_demo"?: boolean,"is_suspended"?: boolean,"level"?: string | null,"locale"?: string,"phone"?: string | null,"postal_code"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sports": {
                  Row: {
                    "created_at": string,"icon": string,"id": string,"is_active": boolean,"name_en": string,"name_fr": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon"?: string,"id"?: string,"is_active"?: boolean,"name_en": string,"name_fr": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"icon"?: string,"id"?: string,"is_active"?: boolean,"name_en"?: string,"name_fr"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"venue_inquiries": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"message": string,"name": string,"venue_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"id"?: string,"message": string,"name": string,"venue_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_inquiries_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address": string | null,"always_open": boolean,"category": Database["public"]['Enums']["venue_category"],"city": string | null,"claim_status": Database["public"]['Enums']["claim_status"],"created_at": string,"description": string,"facilities": (string)[],"id": string,"is_demo": boolean,"is_free": boolean,"is_published": boolean,"lat": number,"lng": number,"name": string,"partner_status": Database["public"]['Enums']["partner_status"],"phone": string | null,"photo_path": string | null,"postal_code": string | null,"slug": string,"source": string,"source_ref": string | null,"sports": (string)[],"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"always_open"?: boolean,"category"?: Database["public"]['Enums']["venue_category"],"city"?: string | null,"claim_status"?: Database["public"]['Enums']["claim_status"],"created_at"?: string,"description"?: string,"facilities"?: (string)[],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"is_published"?: boolean,"lat": number,"lng": number,"name": string,"partner_status"?: Database["public"]['Enums']["partner_status"],"phone"?: string | null,"photo_path"?: string | null,"postal_code"?: string | null,"slug": string,"source"?: string,"source_ref"?: string | null,"sports"?: (string)[],"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"always_open"?: boolean,"category"?: Database["public"]['Enums']["venue_category"],"city"?: string | null,"claim_status"?: Database["public"]['Enums']["claim_status"],"created_at"?: string,"description"?: string,"facilities"?: (string)[],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"is_published"?: boolean,"lat"?: number,"lng"?: number,"name"?: string,"partner_status"?: Database["public"]['Enums']["partner_status"],"phone"?: string | null,"photo_path"?: string | null,"postal_code"?: string | null,"slug"?: string,"source"?: string,"source_ref"?: string | null,"sports"?: (string)[],"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"verification_events": {
                  Row: {
                    "actor_id": string | null,"actor_role": string,"coach_id": string,"created_at": string,"document_id": string | null,"from_status": string | null,"id": number,"is_internal": boolean,"note": string | null,"scope": string,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_role": string,"coach_id": string,"created_at"?: string,"document_id"?: string | null,"from_status"?: string | null,"id"?: never,"is_internal"?: boolean,"note"?: string | null,"scope": string,"to_status": string
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_role"?: string,"coach_id"?: string,"created_at"?: string,"document_id"?: string | null,"from_status"?: string | null,"id"?: never,"is_internal"?: boolean,"note"?: string | null,"scope"?: string,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profile_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_events_coach_id_fkey"
      columns: ["coach_id"]
isOneToOne: false
      referencedRelation: "coach_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verification_events_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "coach_documents"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "profile_cards": {
                  Row: {
                    "city": string | null,"full_name": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "city"?: string | null,"full_name"?: string | null,"id"?: string | null
                         }
                        Update: {
                           "city"?: string | null,"full_name"?: string | null,"id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_decide_coach":
{ Args: { "p_coach_id": string,"p_decision": string,"p_note"?: string }; Returns: Database["public"]['Enums']["verification_status"]
                           },
"admin_review_document":
{ Args: { "p_decision": string,"p_document_id": string,"p_external_check"?: string,"p_note"?: string }; Returns: Database["public"]['Enums']["document_status"]
                           },
"admin_set_coach_published":
{ Args: { "p_coach_id": string,"p_published": boolean }; Returns: undefined
                           },
"admin_set_qualification_status":
{ Args: { "p_qualification_id": string,"p_status": string }; Returns: undefined
                           },
"admin_set_user_suspended":
{ Args: { "p_suspended": boolean,"p_user_id": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"become_coach":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"booking_status_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["booking_status"],"p_to": Database["public"]['Enums']["booking_status"] }; Returns: boolean
                           },
"coach_checklist":
{ Args: { "p_coach_id": string }; Returns: Json
                           },
"coach_checklist_complete":
{ Args: { "p_checklist": Json }; Returns: boolean
                           },
"delete_document":
{ Args: { "p_document_id": string }; Returns: string
                           },
"document_status_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["document_status"],"p_to": Database["public"]['Enums']["document_status"] }; Returns: boolean
                           },
"expire_documents":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_service":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_audit":
{ Args: { "p_action": string,"p_entity": string,"p_entity_id": string,"p_meta": Json }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"notify":
{ Args: { "p_data": Json,"p_kind": string,"p_link": string,"p_user": string }; Returns: undefined
                           },
"notify_admins":
{ Args: { "p_data": Json,"p_kind": string,"p_link": string }; Returns: undefined
                           },
"open_slots":
{ Args: { "p_coach_id": string,"p_duration_min": number,"p_from": string,"p_to": string }; Returns: {
              "starts_at": string
            }[]
                           },
"profile_status_transition_allowed":
{ Args: { "p_from": Database["public"]['Enums']["verification_status"],"p_to": Database["public"]['Enums']["verification_status"] }; Returns: boolean
                           },
"recheck_coach_after_document_change":
{ Args: { "p_coach_id": string,"p_reason": string }; Returns: undefined
                           },
"record_precheck":
{ Args: { "p_document_id": string,"p_passed": boolean,"p_report": Json }; Returns: Database["public"]['Enums']["document_status"]
                           },
"register_document":
{ Args: { "p_expires_on"?: string,"p_file_name": string,"p_mime_type": string,"p_reference"?: string,"p_size_bytes": number,"p_storage_path": string,"p_type_code": string }; Returns: string
                           },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"request_booking":
{ Args: { "p_location_kind"?: string,"p_location_note"?: string,"p_message"?: string,"p_service_id": string,"p_starts_at": string }; Returns: string
                           },
"required_documents_approved":
{ Args: { "p_coach_id": string }; Returns: boolean
                           },
"respond_booking":
{ Args: { "p_action": string,"p_booking_id": string }; Returns: Database["public"]['Enums']["booking_status"]
                           },
"slugify":
{ Args: { "p_text": string }; Returns: string
                           },
"start_conversation":
{ Args: { "p_coach_id": string }; Returns: string
                           },
"submit_coach_profile":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["verification_status"]
                           },
"unique_coach_slug":
{ Args: { "p_name": string,"p_self": string }; Returns: string
                           }
          }
          Enums: {
            "booking_status": "requested"|"accepted"|"declined"|"cancelled"|"completed","claim_status": "unclaimed"|"claimed","document_status": "uploaded"|"precheck_pending"|"precheck_completed"|"needs_attention"|"awaiting_review"|"approved"|"rejected"|"info_requested"|"expired","partner_status": "listed"|"partner","user_role": "customer"|"coach"|"admin","venue_category": "gym"|"studio"|"shop"|"school"|"other"|"club"|"street_workout","verification_status": "draft"|"awaiting_review"|"changes_requested"|"approved"|"rejected"|"suspended"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "booking_status": ["requested", "accepted", "declined", "cancelled", "completed"],"claim_status": ["unclaimed", "claimed"],"document_status": ["uploaded", "precheck_pending", "precheck_completed", "needs_attention", "awaiting_review", "approved", "rejected", "info_requested", "expired"],"partner_status": ["listed", "partner"],"user_role": ["customer", "coach", "admin"],"venue_category": ["gym", "studio", "shop", "school", "other", "club", "street_workout"],"verification_status": ["draft", "awaiting_review", "changes_requested", "approved", "rejected", "suspended"]
          }
        }
} as const
