// frontend/src/services/auth.service.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Exports des interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  province?: string;
  telephone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.token = token;
    
    return { token, user };
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.token = null;
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  hasRole(role: string | string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }

  updateLocalUser(updated: Partial<User>): User | null {
    const user = this.getUser();
    if (!user) return null;
    const merged = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(merged));
    return merged;
  }

  async getProfile(): Promise<User> {
    const token = this.getToken();
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async updateProfile(data: { nom?: string; prenom?: string; telephone?: string }): Promise<User> {
    const token = this.getToken();
    const response = await axios.put(`${API_URL}/auth/profile`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.updateLocalUser(response.data);
    return response.data;
  }

  async changePassword(current_password: string, new_password: string): Promise<void> {
    const token = this.getToken();
    await axios.put(`${API_URL}/auth/password`, { current_password, new_password }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

// Export de l'instance et des types
export const authService = new AuthService();
export default authService;