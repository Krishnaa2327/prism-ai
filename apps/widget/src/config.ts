export interface WidgetConfig {
  apiKey: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  apiUrl?: string;
  // How long (ms) user must be idle before widget re-expands if collapsed
  idleThreshold?: number;
  primaryColor?: string;
}

export const DEFAULT_CONFIG: Required<Omit<WidgetConfig, 'apiKey' | 'userId' | 'metadata'>> = {
  apiUrl: 'http://localhost:4000',
  idleThreshold: 30_000,
  primaryColor: '#6366f1', // indigo
};
