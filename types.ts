export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  RECEPTIONIST = 'RECEPTIONIST',
  DENTIST = 'DENTIST',
  CLIENT = 'CLIENT',
  SUPPLIER = 'SUPPLIER'
}

export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  SECTOR_TRANSITION = 'SECTOR_TRANSITION',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
  RETURNED = 'RETURNED',
  PENDING_REQUISITION = 'PENDING_REQUISITION',
  REJECTED_REQUISITION = 'REJECTED_REQUISITION'
}

export enum UrgencyLevel {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  HIGH = 'HIGH',
  VIP = 'VIP'
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELED = 'CANCELED'
}

export type JobNature = 'NORMAL' | 'REPETITION' | 'ADJUSTMENT';

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  ABSENT = 'ABSENT'
}

export enum InventoryItemType {
  MATERIAL = 'MATERIAL',
  CONSUMABLE = 'CONSUMABLE',
  EQUIPMENT = 'EQUIPMENT',
  TOOL = 'TOOL'
}

export enum InventoryMovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  ADJUSTMENT = 'ADJUSTMENT'
}

export enum ReturnRequestType {
  RETURN = 'RETURN',
  EXCHANGE = 'EXCHANGE',
  DEFECT = 'DEFECT'
}

export enum ReturnRequestReason {
  DEFECT = 'DEFECT',
  WRONG_ITEM = 'WRONG_ITEM',
  REGRET = 'REGRET',
  DAMAGE = 'DAMAGE',
  OTHER = 'OTHER'
}

export enum NotificationType {
  ORDER = 'ORDER',
  REQUISITION = 'REQUISITION',
  FINANCIAL = 'FINANCIAL',
  SYSTEM = 'SYSTEM',
  ALERT = 'ALERT'
}

export type PermissionKey = string;

export const ALL_SYSTEM_PERMISSIONS: PermissionKey[] = [
  'dashboard:view',
  'jobs:view',
  'jobs:create',
  'jobs:edit',
  'jobs:delete',
  'jobs:finish',
  'jobs:reopen',
  'jobs:return',
  'jobs:alert',
  'jobs:print',
  'jobs:chat_toggle',
  'jobs:approval',
  'jobs:change_status',
  'jobs:production_view',
  'jobs:production_edit',
  'jobs:service_details_view',
  'jobs:service_details_edit',
  'jobs:prices_view',
  'budgets:view',
  'budgets:create',
  'budgets:edit',
  'budgets:delete',
  'vip:view',
  'calendar:view',
  'clients:view',
  'finance:view',
  'receipts:view',
  'commissions:view',
  'commissions:edit',
  'prices:view',
  'inventory:view',
  'catalog:view',
  'catalog:prices_view',
  'logistics:view',
  'reports:view',
  'monitoring:view',
  'tutorials:view',
  'helpdesk:view',
  'users:view',
  'sectors:view',
  'boxes:view'
];

export interface VariationOption {
  id: string;
  name: string;
  priceModifier?: number;
  isDiscountExempt?: boolean;
}

export interface VariationGroup {
  id: string;
  name: string;
  options: VariationOption[];
  selectionType?: string;
}

export interface JobItem {
  id: string;
  jobTypeId?: string;
  name: string;
  quantity: number;
  price: number;
  appliedDiscount?: number;
  selectedVariationIds?: string[];
  selectedTeeth?: string[];
  nature?: JobNature | string;
  basePriceBeforeDiscount?: number;
  commissionDisabled?: boolean;
  sectorQuantities?: Record<string, number>;
  stageQuantities?: Record<string, Record<string, number>>;
  sectorStages?: Record<string, string[]>;
  variationValues?: Record<string, string>;
  sectorCommissionDisabled?: Record<string, boolean>;
  color?: string;
  [key: string]: any;
}

export interface JobHistoryItem {
  id?: string;
  action?: string;
  statusFrom?: string;
  statusTo?: string;
  userId?: string;
  userName?: string;
  timestamp: any;
  notes?: string;
  sector?: string;
  observations?: string;
}

export interface Job {
  id: string;
  osNumber: string;
  boxNumber?: string;
  boxColor?: { hex: string; name?: string };
  dentistId?: string;
  dentistName: string;
  dentistOrgId?: string;
  subDentistName?: string;
  clinicName?: string;
  patientName: string;
  status: JobStatus | string;
  urgency?: UrgencyLevel | string;
  currentSector?: string;
  totalValue: number;
  createdAt: any;
  dueDate: any;
  dueTime?: string;
  completedAt?: any;
  firstCompletedAt?: any;
  wasReopened?: boolean;
  reopenedAt?: any;
  lastRefinalizedAt?: any;
  origin?: string;
  paymentStatus?: string;
  items: JobItem[];
  history?: JobHistoryItem[];
  routeId?: string;
  rejectionReason?: string;
  isBudget?: boolean;
  isComboPurchase?: boolean;
  isPseudo?: boolean;
  notes?: string;
  caseNotes?: string;
  trackingCode?: string;
  shippingCarrier?: string;
  shippingMethod?: string;
  sectorEntryTime?: any;
  sectorMovements?: any[];
  itemExecutions?: any[];
  products?: any[];
  attachments?: any[];
  [key: string]: any;
}

export interface JobType {
  id: string;
  name: string;
  category?: string;
  price: number;
  basePrice?: number;
  variationGroups?: VariationGroup[];
  variations?: any[];
  allowedSectors?: string[];
  sectorStages?: Record<string, string[]>;
  stageQuantities?: Record<string, Record<string, number>>;
  isVisibleInternally?: boolean;
  isVisibleInternallyLabs?: boolean;
  [key: string]: any;
}

export interface ManualDentist {
  id: string;
  name: string;
  clinicName?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  isBlocked?: boolean;
  priceTableId?: string;
  isCustomPricing?: boolean;
  customPrices?: any[];
  globalDiscountPercent?: number;
  [key: string]: any;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole | string;
  clinicName?: string;
  phone?: string;
  whatsapp?: string;
  permissions?: PermissionKey[];
  organizationId?: string;
  sector?: string;
  sectors?: string[];
  isBlocked?: boolean;
  manualDentistId?: string;
  [key: string]: any;
}

export interface Sector {
  id: string;
  name: string;
  stages?: string[];
}

export interface DentistPayment {
  id: string;
  dentistId?: string;
  dentistName?: string;
  amount: number;
  discount?: number;
  paymentMethod: string;
  paymentDate: any;
  type?: string;
  notes?: string;
}

export interface BillingBatch {
  id: string;
  dentistId?: string;
  dentistName?: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELED';
  createdAt: any;
}

export interface Organization {
  id: string;
  name: string;
  orgType?: 'LAB' | 'CLINIC' | 'SUPPLIER' | 'LAB_OUTSOURCED' | string;
  logoUrl?: string;
  slug?: string;
  subscriptionStatus?: string;
  trialEndsAt?: any;
  planId?: string;
  isApproved?: boolean;
  frenetToken?: string;
  revealJobStatusToDentist?: boolean;
  [key: string]: any;
}

export interface JobProduct {
  id: string;
  name: string;
  quantity: number;
  price: number;
  productId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  fileType: string;
  size?: number;
  uploadedAt?: any;
  uploadedBy?: string;
  comment?: string;
}

export interface DeliveryRoute {
  id: string;
  driverName: string;
  date: any;
  shift: 'MORNING' | 'AFTERNOON';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  items?: any[];
}

export interface RouteItem {
  id: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  dentistName: string;
  status: string;
}

export interface Courier {
  id: string;
  name: string;
  phone?: string;
}

export interface LabRating {
  id: string;
  jobId?: string;
  dentistId?: string;
  labId?: string;
  patientName?: string;
  rating: number;
  comment?: string;
  createdAt: any;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  category?: string;
  categoryId?: string;
  type?: InventoryItemType | string;
  currentStock: number;
  minStock?: number;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  description?: string;
  [key: string]: any;
}

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  type: InventoryMovementType | string;
  quantity: number;
  date: any;
  reason?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  buyerName: string;
  items: any[];
  totalValue: number;
  status: string;
  createdAt: any;
}

export interface OrderReturnRequest {
  id: string;
  orderId: string;
  type: ReturnRequestType | string;
  reason: ReturnRequestReason | string;
  status: string;
  createdAt: any;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  [key: string]: any;
}

export interface BannerConfig {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
}

export interface MarketplaceBannerConfig {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface LabCoupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features?: any;
}

export interface GlobalWhatsAppTemplate {
  id: string;
  name: string;
  content: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps?: TutorialStep[];
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
}

export interface BioSettings {
  id: string;
  title: string;
  bio: string;
  avatarUrl: string;
  links?: BioLink[];
}

export interface BioLink {
  id: string;
  title: string;
  url: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  status: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export interface NfcKit {
  id: string;
  kitNumber: string;
  boxes?: NfcBox[];
}

export interface NfcBox {
  id: string;
  boxNumber: string;
  nfcTagId: string;
}

export interface UserCommissionSetting {
  userId: string;
  percentage: number;
}

export interface CommissionGroup {
  id: string;
  name: string;
  percentage: number;
}

export interface CommissionRecord {
  id: string;
  userId: string;
  userName: string;
  jobId: string;
  osNumber: string;
  patientName: string;
  amount: number;
  status: CommissionStatus | string;
  createdAt: any;
  sector?: string;
}

export interface ClinicService {
  id: string;
  name: string;
  price: number;
}

export interface ClinicRoom {
  id: string;
  name: string;
}

export interface ClinicPatient {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  history?: PatientHistoryRecord[];
}

export interface PatientHistoryRecord {
  id: string;
  date: any;
  description: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  dentistName: string;
  date: any;
  time: string;
  status: AppointmentStatus | string;
}

export interface ClinicDentist {
  id: string;
  name: string;
  specialty?: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: any;
  category?: string;
}

export interface PatientPayment {
  id: string;
  patientId: string;
  amount: number;
  date: any;
}

export interface PatientBillingBatch {
  id: string;
  patientId: string;
  totalAmount: number;
  date: any;
}

export interface OnlineRequisition {
  id: string;
  patientName: string;
  dentistId?: string;
  dentistManualId?: string;
  dentistName: string;
  serviceId: string;
  serviceName: string;
  quantity?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  createdAt: any;
  notes?: string;
  rejectionReason?: string;
  attachments?: any[];
  labName?: string;
  [key: string]: any;
}

export interface JobAlert {
  id: string;
  jobId: string;
  message: string;
  createdAt: any;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

export interface CaseApprovalItem {
  id: string;
  title: string;
  status: string;
  replies?: CaseApprovalReply[];
  files?: CaseApprovalFile[];
}

export interface CaseApprovalReply {
  id: string;
  text: string;
  senderName: string;
  timestamp: any;
}

export interface CaseApprovalFile {
  id: string;
  url: string;
  name: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  read: boolean;
  createdAt: any;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  primaryColor?: string;
}

export interface Receipt {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  date: any;
}

export interface PriceTable {
  id: string;
  name: string;
  prices?: Record<string, any>;
}

export interface JobItemExecution {
  itemId: string;
  jobTypeId?: string;
  jobTypeName?: string;
  sector: string;
  userId: string;
  userName: string;
  entryTime?: any;
  timestamp?: any;
  stageTimes?: Record<string, any>;
  isBaseChecked?: boolean;
}

export interface SectorMovement {
  id: string;
  sector: string;
  entryTime: any;
  exitTime?: any;
  entryUserId?: string;
  entryUserName?: string;
  exitUserId?: string;
  exitUserName?: string;
}

export const isReviewerUser = (user: any): boolean => {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase();
  return email.includes('reviewer') || email.includes('teste') || user.isReviewer === true;
};

export const isClinicReviewer = (user: any): boolean => {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase();
  return email.includes('clinic') || email.includes('clinica');
};

export const isSupplierReviewer = (user: any): boolean => {
  if (!user) return false;
  const email = String(user.email || '').toLowerCase();
  return email.includes('supplier') || email.includes('fornecedor');
};
