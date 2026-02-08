
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionCategory = 
  | 'PRODUCTION' 
  | 'STORE' 
  | 'SUPPLIES' 
  | 'RENT' 
  | 'SALARY' 
  | 'MARKETING' 
  | 'TAX'
  | 'OFFICE'   
  | 'OTHER';

export interface GlobalSettings {
  platformCommission: number;
  updatedAt: Date;
  updatedBy: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string; 
  logoUrl?: string; 
  planId: string;
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'PENDING';
  trialEndsAt?: Date;
  createdAt: Date;
  orgType?: 'LAB' | 'CLINIC';
  ratingAverage?: number;
  ratingCount?: number;
  financialSettings?: {
    pixKey?: string;
    bankInfo?: string;
    instructions?: string;
    paymentLink?: string;
    asaasWalletId?: string;
    asaasWalletStatus?: string;
    asaasAccountNumber?: string;
    businessData?: any;
    balance?: number;
    pendingBalance?: number;
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
    hasInternalManagement: boolean; // Novo: Define se pode criar OS manual e gerir produção
  };
}

// ... (resto do arquivo types.ts permanece igual)
export interface ClinicRoom {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ClinicDentist {
  id: string;
  name: string;
  cro: string;
  specialty: string;
  color: string; 
  active: boolean;
}

export interface DeliveryRoute {
  id: string;
  organizationId: string;
  date: Date;
  shift: 'MORNING' | 'AFTERNOON';
  driverName: string;
  status: 'OPEN' | 'IN_TRANSIT' | 'COMPLETED';
  createdAt: Date;
}

export interface RouteItem {
  id: string;
  routeId: string;
  jobId?: string;
  dentistId: string;
  dentistName: string;
  clinicName?: string;
  patientName?: string;
  address: string;
  type: 'DELIVERY' | 'PICKUP';
  order: number;
}

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

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  COLLABORATOR = 'COLLABORATOR',
  CLIENT = 'CLIENT',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export type PermissionKey = 
  | 'jobs:create' 
  | 'jobs:edit' 
  | 'jobs:delete'
  | 'jobs:view'
  | 'finance:view'
  | 'finance:manage'
  | 'catalog:manage'
  | 'clients:manage'
  | 'sectors:manage'
  | 'users:manage'
  | 'vip:view'
  | 'calendar:view'
  | 'commissions:view'
  | 'logistics:manage';

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

export interface LabRating {
  id: string;
  labId: string;
  dentistId: string;
  dentistName: string;
  jobId: string;
  score: number; 
  comment?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text?: string;
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt?: Date;
  deleted?: boolean;
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
  dueTime?: string;
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
  asaasPaymentId?: string;
  batchId?: string;
  ratingId?: string; 
  routeId?: string;
  chatEnabled?: boolean;
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
  isDiscountExempt?: boolean; 
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

export interface ClinicService {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes: number;
  active: boolean;
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
  permissions?: PermissionKey[]; 
  clinicName?: string;
  commissionSettings?: UserCommissionSetting[];
  globalDiscountPercent?: number; 
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number; 
  }[];
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  fcmTokens?: string[];
  deliveryViaPost?: boolean;
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

export interface PatientHistoryRecord {
  id: string;
  patientId: string;
  type: 'PROCEDURE' | 'SCAN' | 'XRAY' | 'EVOLUTION' | 'NOTE';
  description: string;
  date: Date;
  attachments?: Attachment[];
  professionalId?: string;
  professionalName?: string;
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
  roomId?: string; 
  clinicDentistId?: string; 
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
  cpfCnpj?: string;
  cro?: string;
  birthDate?: string;
  approvalDate?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: Date;
  globalDiscountPercent?: number; 
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number; 
  }[];
  deliveryViaPost?: boolean;
}
