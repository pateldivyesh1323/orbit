export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_verified: boolean;
};

export type RegisterPayload = {
  email: string;
  password: string;
  display_name: string;
  whatsapp_number?: string;
};
