export interface UserData {
  id: string;
  username: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  id?: string;
  username?: string;
  error?: string;
}
