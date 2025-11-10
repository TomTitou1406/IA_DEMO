// Types partagés entre Neo et DIY
// À enrichir progressivement

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Export vide pour l'instant
export {};