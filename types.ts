// --- USER & AUTH ---
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // SaaS Owner
  ADMIN = 'ADMIN', // Lab Owner/Admin
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT' // Dentist
}

export interface User {
  id: string; 
  organizationId?: string; // Optional for Dentists/SuperAdmin
  name: string;
  email: string;
  role: UserRole;
  clinicName?: string; 
  sector?: string; 
  customPrices?: CustomPrice[]; 
}

// --- SAAS STRUCTURE ---

export interface SubscriptionPlanFeatures {
  maxUsers: number; // -1 for unlimited
  maxStorageGB: number;
  hasStoreModule: boolean;
  hasClinicModule: boolean;
}

export interface SubscriptionPlan {
  id: string; // e.g., 'basic', 'pro', 'partner_vip'
  name: string;
  price: number; // 0 for free
  description?: string;
  features: SubscriptionPlanFeatures;
  trialDays?: number; // New: Days of free trial
  isPublic: boolean; // If false, only Admin can assign (for Partners/Internal)
  active: boolean;
}

export interface FinancialSettings {
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  bankInfo?: string; // Agency/Account text
  paymentLink?: string; // External link (Mercado Pago, Stripe Link, etc)
  instructions?: string;
}

export interface Organization {
  id: string;
  name: string; // Lab's name
  ownerId: string; // The first Admin user
  planId: string; // Link to the subscription plan
  subscriptionStatus?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL';
  trialEndsAt?: Date; // New: When the trial expires
  financialSettings?: FinancialSettings; // For receiving payments from Dentists
  createdAt: Date;
  storageUsageBytes?: number;
}

export interface OrganizationConnection {
  id: string;
  dentistId: string;
  organizationId: string;
  organizationName: string; 
  status: 'active' | 'pending' | 'revoked';
  createdAt: Date;
}

// --- LAB & CLINIC DATA (Now scoped by Organization) ---

export enum JobStatus {
  WAITING_APPROVAL = 'WAITING_APPROVAL', 
  PENDING = 'PENDING', 
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED'
}

export enum UrgencyLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  VIP = 'VIP' 
}

export interface BoxColor {
  id: string;
  name: string;
  hex: string;
}

export interface Sector {
  id: string;
  name: string;
}

export interface VariationOption {
  id: string;
  name: string;
  priceModifier: number;
  disablesOptions?: string[]; 
}

export interface VariationGroup {
  id: string;
  name: string;
  selectionType: 'SINGLE' | 'MULTIPLE' | 'TEXT';
  options: VariationOption[];
}

export interface JobType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  variationGroups: VariationGroup[]; 
}

export interface JobItem {
  id: string;
  jobTypeId: string;
  name: string;
  quantity: number;
  price: number; 
  selectedVariationIds?: string[];
  variationValues?: Record<string, string>;
  commissionDisabled?: boolean; 
}

export interface JobHistoryEvent {
  id:string;
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  sector?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface Job {
  id: string; 
  organizationId: string; // Data Scoping
  osNumber?: string; 
  patientName: string;
  dentistId: string;
  dentistName: string;
  status: JobStatus;
  urgency: UrgencyLevel;
  items: JobItem[];
  history: JobHistoryEvent[];
  attachments?: Attachment[]; 
  createdAt: Date;
  dueDate: Date;
  boxNumber?: string;
  boxColor?: BoxColor;
  currentSector?: string;
  totalValue: number;
  notes?: string;
  managerNotes?: string; 
}

export interface JobAlert {
  id: string;
  organizationId: string; // Data Scoping
  jobId: string;
  osNumber: string;
  message: string;
  targetSector?: string; 
  targetUserId?: string; 
  scheduledFor: Date;
  createdBy: string;
  createdAt: Date;
  readBy: string[]; 
}

export interface CustomPrice {
  jobTypeId: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; 
  jobType: JobType;
  quantity: number;
  unitPrice: number; 
  finalPrice: number; 
  selectedVariationIds: string[];
  variationValues?: Record<string, string>;
}

export interface ClinicPatient {
  id: string;
  organizationId: string; // Data Scoping
  dentistId: string; 
  name: string;
  cpf?: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  address?: string;
  anamnesis?: string;
  createdAt: Date;
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW'
}

export interface Appointment {
  id: string;
  organizationId: string; // Data Scoping
  dentistId: string;
  patientId: string;
  patientName: string; 
  date: Date;
  durationMinutes: number; 
  procedure: string;
  notes?: string;
  status: AppointmentStatus;
}