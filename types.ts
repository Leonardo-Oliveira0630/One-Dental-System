
// --- USER & AUTH ---

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT'
}

export interface UserCommissionSetting {
  jobTypeId: string;
  value: number;
  type: 'FIXED' | 'PERCENTAGE';
}

export interface User {
  id: string;
  organizationId?: string;
  name: string;
  email: string;
  role: UserRole;
  clinicName?: string; 
  sector?: string; 
  customPrices?: CustomPrice[]; 
  commissionSettings?: UserCommissionSetting[]; // Configurações de comissão
}

// --- COMMISSIONS ---

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export interface CommissionRecord {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  amount: number;
  status: CommissionStatus;
  createdAt: Date;
  paidAt?: Date;
  sector: string;
}

// --- SAAS STRUCTURE ---

export interface SubscriptionPlanFeatures {
  maxUsers: number;
  maxStorageGB: number;
  hasStoreModule: boolean;
  hasClinicModule: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features: SubscriptionPlanFeatures;
  trialDays?: number; 
  isPublic: boolean;
  active: boolean;
  targetAudience: 'LAB' | 'CLINIC';
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'TRIAL_EXT' | 'FREE_FOREVER';
  discountValue: number;
  validUntil?: Date;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  applicablePlans?: string[];
}

export interface FinancialSettings {
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  bankInfo?: string; 
  paymentLink?: string; 
  instructions?: string;
  asaasWalletId?: string;
  asaasApiKey?: string;
  walletStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED';
}

export interface Organization {
  id: string;
  orgType: 'LAB' | 'CLINIC';
  name: string;
  ownerId: string;
  planId: string;
  subscriptionStatus?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL';
  trialEndsAt?: Date; 
  financialSettings?: FinancialSettings;
  appliedCoupon?: string;
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
  isVisibleInStore?: boolean;
  imageUrl?: string;
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
  organizationId: string;
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
  paymentStatus?: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REFUNDED' | 'FAILED';
  paymentMethod?: 'CREDIT_CARD' | 'PIX';
  paymentId?: string;
  pixCopyPaste?: string;
  pixQrCode?: string;
}

export interface JobAlert {
  id: string;
  organizationId: string;
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
  organizationId: string;
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
  organizationId: string;
  dentistId: string;
  patientId: string;
  patientName: string; 
  date: Date;
  durationMinutes: number; 
  procedure: string;
  notes?: string;
  status: AppointmentStatus;
}
