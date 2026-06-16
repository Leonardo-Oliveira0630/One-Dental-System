
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

export interface StoreSettings {
  banners?: string[];
  layoutType?: 'CARDS' | 'LIST';
  portfolio?: {
    id: string;
    title: string;
    imageUrl: string;
    description?: string;
  }[];
  menuOptions?: string[];
  catchphrase?: string;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string; 
  planId: string;
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'OVERDUE' | 'CANCELLED' | 'PENDING' | 'FREE' | 'TEST';
  trialEndsAt?: Date;
  createdAt: Date;
  orgType?: 'LAB' | 'CLINIC';
  asaasApiKey?: string;
  ratingAverage?: number;
  ratingCount?: number;
  storeSettings?: StoreSettings;
  storeSlug?: string;
  storeVisibility?: 'PUBLIC' | 'PRIVATE';
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
    techResponsibleName?: string;
    techResponsibleCpf?: string;
  };
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  country?: string;
  phone?: string;
  email?: string;
  croUf?: string;
  croNumero?: string;
  croCategoria?: string;
  croValid?: boolean;
  isApproved?: boolean;
}

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

export interface Courier {
  id: string;
  organizationId: string;
  name: string;
  phone?: string;
  vehicle?: string;
  active: boolean;
  createdAt: Date;
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
  boletoUrl?: string;
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
  | 'jobs:view' | 'jobs:create' | 'jobs:edit' | 'jobs:delete'
  | 'finance:view' | 'finance:create' | 'finance:edit' | 'finance:delete'
  | 'catalog:view' | 'catalog:create' | 'catalog:edit' | 'catalog:delete' | 'catalog:prices_view'
  | 'clients:view' | 'clients:create' | 'clients:edit' | 'clients:delete' | 'clients:block_manage' | 'clients:statement_view'
  | 'sectors:view' | 'sectors:create' | 'sectors:edit' | 'sectors:delete'
  | 'users:view' | 'users:create' | 'users:edit' | 'users:delete'
  | 'commissions:view' | 'commissions:create' | 'commissions:edit' | 'commissions:delete'
  | 'receipts:view' | 'receipts:create' | 'receipts:edit' | 'receipts:delete'
  | 'logistics:view' | 'logistics:create' | 'logistics:edit' | 'logistics:delete'
  | 'boxes:view' | 'boxes:create' | 'boxes:edit' | 'boxes:delete'
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:delete'
  | 'vip:view'
  | 'calendar:view';

export type InventoryItemType = 'MATERIAL' | 'MACHINERY' | 'SUPPLY' | 'IMPLANT' | 'OTHER';

export interface InventoryCategory {
  id: string;
  name: string;
  type: InventoryItemType;
  organizationId: string;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  name: string;
  code?: string;
  description?: string;
  type: InventoryItemType;
  currentStock: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
  dentistOwnerId?: string | null;
  organizationId: string;
}

export interface JobProduct {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  basePriceBeforeDiscount?: number;
  appliedDiscount?: number;
  dentistOwnerId?: string | null;
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  SECTOR_TRANSITION = 'SECTOR_TRANSITION'
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
  basePriceBeforeDiscount?: number;
  appliedDiscount?: number;
  appliedPriceTable?: string;
  nature: JobNature;
  selectedVariationIds: string[];
  variationValues?: Record<string, string>;
  commissionDisabled?: boolean;
  sectorQuantities?: Record<string, number>;
  sectorCommissionDisabled?: Record<string, boolean>;
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

export interface JobItemExecution {
  itemId: string;
  jobTypeId: string;
  jobTypeName: string;
  sector: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface SectorMovement {
  id: string;
  sector: string;
  entryTime: Date;
  entryUserId: string;
  entryUserName: string;
  exitTime?: Date;
  exitUserId?: string;
  exitUserName?: string;
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
  products?: JobProduct[];
  history: JobHistory[];
  sectorMovements?: SectorMovement[];
  itemExecutions?: JobItemExecution[];
  createdAt: Date;
  dueDate: Date;
  dueTime?: string;
  boxNumber?: string;
  boxColor?: BoxColor;
  currentSector?: string;
  sectorEntryTime?: Date;
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
  baseCommission?: number;
  variationGroups: VariationGroup[];
  isVisibleInStore?: boolean;
  imageUrl?: string;
  allowedSectors?: string[];
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

export interface PriceTable {
  id: string;
  organizationId: string;
  name: string;
  prices: {
    [jobTypeId: string]: {
      basePrice: number;
      variations: {
        [optionId: string]: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  cpfCnpj?: string;
  organizationId?: string;
  sector?: string;
  permissions?: PermissionKey[]; 
  termsAcceptedAt?: Date | string;
  clinicName?: string;
  commissionSettings?: UserCommissionSetting[];
  globalDiscountPercent?: number; 
  priceTableId?: string;
  isCustomPricing?: boolean;
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number;
    fixedPrice?: number;
    variations?: { [optionId: string]: number };
  }[];
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  country?: string;
  fcmTokens?: string[];
  deliveryViaPost?: boolean;
  billingLimit?: number;
  isBlocked?: boolean;
  blockReason?: 'DEBT' | 'FINANCIAL_APPROVAL';
  temporaryUnblockUntil?: Date;
  croUf?: string;
  croNumero?: string;
  croCategoria?: string;
  croValid?: boolean;
  isApproved?: boolean;
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
  birthDate?: string;
  planName?: string;
  clinicalAlerts?: string[];
  createdAt: Date;
}

// NOVO: Prontuário do Paciente
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
    maxDentists: number;
    maxJobsPerMonth: number;
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

export interface LabCoupon {
  id: string;
  organizationId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validUntil?: string;
  maxUses?: number;
  usedCount: number;
  active: boolean;
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

export interface PaymentRecord {
  id: string;
  organizationId: string;
  organizationName: string;
  planId: string;
  planName: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  paymentDate?: Date;
  dueDate: Date;
  paymentMethod?: string;
  createdAt: Date;
}

export interface DentistPayment {
  id: string;
  organizationId: string;
  dentistId: string;
  dentistName: string;
  amount: number;
  interest?: number; // Juros
  fees?: number;     // Taxas
  discount?: number; // Desconto no ato do pagamento
  paymentMethod: 'PIX' | 'BOLETO' | 'CARD' | 'CASH' | 'TRANSFER' | 'DISCOUNT' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER';
  paymentDate: Date;
  cardMachineId?: string;
  bankAccountId?: string;
  type: 'PAYMENT' | 'DISCOUNT';
  notes?: string;
  batchId?: string;
  createdAt: Date;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface CardMachine {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface BankAccount {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  createdAt: Date;
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
  priceTableId?: string;
  isCustomPricing?: boolean;
  customPrices?: { 
    jobTypeId: string; 
    price?: number; 
    discountPercent?: number;
    fixedPrice?: number;
    variations?: { [optionId: string]: number };
  }[];
  deliveryViaPost?: boolean;
  billingLimit?: number;
  isBlocked?: boolean;
  blockReason?: 'DEBT' | 'FINANCIAL_APPROVAL';
  temporaryUnblockUntil?: Date;
}

export interface Receipt {
  id: string;
  organizationId: string;
  dtEmissao: Date;
  numero: string;
  clienteId: string;
  clienteName: string;
  cpfCnpj: string;
  emitidoComo: 'PF' | 'PJ';
  titularRecibo: string;
  empresaId?: string;
  nomeTitular: string;
  cpfCnpjTitular: string;
  referente: string;
  descricaoServico: string;
  mensagem: string;
  cheque: string;
  banco: string;
  impostos: string;
  valorBruto: number;
  valorDesconto: number;
  valorBrutoComDesconto: number;
  valorLiquido: number;
  createdAt: Date;
  createdBy: string;
}

export interface TutorialStep {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAudience: 'LAB' | 'CLINIC';
  writtenContent: string;
  steps: TutorialStep[];
  videoUrl?: string;
  videoSubtitle?: string;
  orderIndex: number;
  createdAt?: any;
}

export interface ClinicBudget {
  id: string;
  patientId: string;
  title: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  date: Date;
  notes?: string;
  items?: { description: string; qty: number; value: number }[];
  createdAt: Date;
}

export interface ClinicPrescription {
  id: string;
  patientId: string;
  dentistName: string;
  date: Date;
  items: { medication: string; instructions: string }[];
  notes?: string;
  createdAt: Date;
}

export interface ClinicClinicalCard {
  id: string;
  patientId: string;
  title: string;
  date: Date;
  notes: string;
  toothNumber?: string;
  dentistName: string;
  createdAt: Date;
}

export interface ClinicAnamnesis {
  id: string;
  patientId: string;
  updatedAt: Date;
  responses: { [key: string]: boolean | string };
}

export interface ClinicPatientFinance {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  date: Date;
  createdAt: Date;
}

export interface PatientPayment {
  id: string;
  organizationId: string;
  patientId: string;
  amount: number;
  interest?: number;
  fees?: number;
  discount?: number;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CASH' | 'OTHER';
  paymentDate: Date;
  createdAt: Date;
  type: 'PAYMENT' | 'DISCOUNT' | 'REFUND';
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  bankAccountId?: string;
  cardMachineId?: string;
}

export interface PatientBillingBatch {
  id: string;
  organizationId: string;
  patientId: string;
  appointmentIds: string[];
  totalAmount: number;
  billingDate: Date;
  dueDate: Date;
  status: 'PENDING' | 'CONFIRMED' | 'OVERDUE' | 'RECEIVED' | 'CANCELLED';
  createdAt: Date;
  paymentLink?: string;
  asaasInvoiceId?: string;
  bankSlipUrl?: string;
  pixCopyPaste?: string;
  pixQrCode?: string;
}



