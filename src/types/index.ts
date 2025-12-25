export type Gender = 'female' | 'male' | 'neutral';

export interface User {
  id: string;
  email: string;
  display_name: string;
  gender: Gender;

  apple_id: string | null;
  google_id: string | null;
  avatar_url: string | null;

  push_token: string | null;
  push_enabled: boolean;

  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    is_new_user: boolean;
  };
}
