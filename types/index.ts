// ─── Arima Universe — Type Definitions ───

// ─── Navigation ───
export type NavLink = {
  label: string;
  href: string;
  isExternal?: boolean;
};

export type NavVariant = 'light' | 'dark' | 'transparent';

// ─── Doors ───
export type DoorId = 'work-with-us' | 'client-portfolio' | 'research-projects';

export type DoorTheme = {
  id: DoorId;
  label: string;
  subtitle: string;
  description: string;
  accentColor: string;
  path: string;
  visualLanguage: string[];
  doorNumber: string;
  ambientGlow: string;
};

// ─── Mind Map ───
export type MindNodeType = 'root' | 'branch' | 'leaf';

export type MindNode = {
  id: string;
  label: string;
  type: MindNodeType;
  x: number;
  y: number;
  children: string[];
  parentId: string | null;
  depth: number;
  description?: string;
  color?: string;
  metadata?: Record<string, unknown>;
};

export type ConnectionLine = {
  id: string;
  sourceId: string;
  targetId: string;
  animated?: boolean;
  label?: string;
};

export type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

// ─── Authentication ───
export type AuthStep = 'initializing' | 'idle' | 'loading' | 'success' | 'error';

export type AuthFormData = {
  email: string;
  password: string;
  confirmPassword?: string;
  name?: string;
};

export type AuthValidationError = {
  field: keyof AuthFormData;
  message: string;
};

export type AuthState = {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: User | null;
  step: AuthStep;
  error: string | null;
  errorCode?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  workspaceId?: string | null;
  avatar?: string | null;
  createdAt: string;
};

// ─── Theme ───
export type ThemeMode = 'dark' | 'light';

export type ThemeAccent = 'investment' | 'projects' | 'portfolio' | 'default';

// ─── Animation ───
export type AnimationVariant = 'fade' | 'slide' | 'scale' | 'rotate' | 'reveal';

export type TransitionDirection = 'up' | 'down' | 'left' | 'right';

export type GSAPTimelineConfig = {
  id: string;
  duration?: number;
  ease?: string;
  delay?: number;
  stagger?: number;
};

// ─── Page Metadata ───
export type PageMeta = {
  title: string;
  description: string;
  path: string;
  isProtected?: boolean;
};

// ─── Component Props ───
export type AnimatedButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'door';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  href?: string;
};

export type DoorCardProps = {
  door: DoorTheme;
  onEnter?: (doorId: DoorId) => void;
  isLocked?: boolean;
};

export type LoadingScreenProps = {
  message?: string;
  progress?: number;
  onComplete?: () => void;
};

export type PageTransitionProps = {
  children: React.ReactNode;
  variant?: AnimationVariant;
};

// ─── Cinematic Chapters ───
export const CINEMATIC_CHAPTERS = [
  { id: 'arrival', title: 'Arrival in Darkness' },
  { id: 'data-universe', title: 'Financial Data Universe' },
  { id: 'institutions', title: 'Market Institutions' },
  { id: 'headquarters', title: 'AF Headquarters' },
  { id: 'founder', title: 'Founder Identity' },
  { id: 'engine', title: 'Arima Finance Engine' },
  { id: 'ecosystem', title: 'Arima Ecosystem' },
  { id: 'doors', title: 'Three Doors' },
] as const;
