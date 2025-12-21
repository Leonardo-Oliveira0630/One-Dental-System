
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionCategory = 
  | 'PRODUCTION' 
  | 'STORE' 
  | 'SUPPLIES' // Insumos (Cerâmica, Gesso, etc)
  | 'RENT' 
  | 'SALARY' 
  | 'MARKETING' 
  | 'TAX'
  | 'OFFICE'   // Material de escritório
  | 'OTHER';

export interface Expense {
  id: string;
  organizationId: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  date: Date;
  status: 'PENDING' | 'PAID';
  attachmentUrl?: string;
  createdAt: Date;
}

export interface BillingBatch {
  id: string;
  organizationId: string;
  dentistId: string;
  dentistName: string;
  jobIds: string[];
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  invoiceUrl?: string; 
  nfeUrl?: string;     
  nfeNumber?: string;
  createdAt: Date;
}

// Added missing Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
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

export type JobNature = 'NORMAL' | 'REPETITION' | 'ADJUSTMENT';

// Added missing Interfaces
export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface BoxColor {
  id: string;
  name: string;
  hex: string;
}

export interface JobItem {
  id: string;
  jobTypeId: string;
  name: string;
  quantity: number;
  price: number;
  nature: JobNature;
  selectedVariationIds: string[];
  variationValues?: Record<string, string>;
  commissionDisabled?: boolean;
}

export interface JobHistory {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  sector?: string;
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
  history: JobHistory[];
  createdAt: Date;
  dueDate: Date;
  boxNumber?: string;
  boxColor?: BoxColor;
  currentSector?: string;
  totalValue: number;
  notes?: string;
  managerNotes?: string;
  attachments?: Attachment[];
  paymentStatus?: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REFUNDED';
  paymentMethod?: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'CASH' | 'TRANSFER';
  pixQrCode?: string;
  pixCopyPaste?: string;
  batchId?: string;
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

export interface UserCommissionSetting {
  jobTypeId: string;
  value: number;
  type: 'FIXED' | 'PERCENTAGE';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  sector?: string;
  clinicName?: string;
  commissionSettings?: UserCommissionSetting[];
  customPrices?: { jobTypeId: string; price: number }[];
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

export interface ClinicPatient {
  id: string;
  organizationId: string;
  dentistId: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  createdAt: Date;
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
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
  status: AppointmentStatus;
  notes?: string;
}

export interface Organization {
  id: string;
  name: string;
  planId: string;
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'PENDING';
  trialEndsAt?: Date;
  createdAt: Date;
  orgType?: 'LAB' | 'CLINIC';
  financialSettings?: {
    pixKey?: string;
    bankInfo?: string;
    instructions?: string;
    paymentLink?: string;
    asaasWalletId?: string;
    walletStatus?: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  isPublic: boolean;
  active: boolean;
  targetAudience?: 'LAB' | 'CLINIC';
  trialDays?: number;
  features: {
    maxUsers: number;
    maxStorageGB: number;
    hasStoreModule: boolean;
    hasClinicModule: boolean;
  };
}

export interface OrganizationConnection {
  id: string;
  organizationId: string;
  organizationName: string;
  status: 'ACTIVE' | 'PENDING';
  createdAt: Date;
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

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export interface CommissionRecord {
  id: string;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  amount: number;
  status: CommissionStatus;
  createdAt: Date;
  sector: string;
  paidAt?: Date;
}

export interface ManualDentist {
  id: string;
  organizationId: string;
  name: string;
  clinicName?: string;
  email?: string;
  phone?: string;
  createdAt: Date;
}
