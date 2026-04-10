export interface WidgetConfig {
  apiKey: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  apiUrl?: string;
  // How long (ms) user must be idle before widget triggers
  idleThreshold?: number;
  // Delay (ms) before showing the bubble after trigger
  triggerDelay?: number;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export const DEFAULT_CONFIG: Required<Omit<WidgetConfig, 'apiKey' | 'userId' | 'metadata'>> = {
  apiUrl: 'http://localhost:4000',
  idleThreshold: 30_000,   // 30 seconds idle → trigger
  triggerDelay: 500,
  primaryColor: '#6366f1', // indigo
  position: 'bottom-right',
};
