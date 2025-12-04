

import { Job, JobStatus, UrgencyLevel, User, UserRole, JobType, BoxColor, Sector, VariationOption, ClinicPatient, Appointment, AppointmentStatus } from "../types";

// Fix: Added a mock organization ID to be used across all mock data that requires it.
const MOCK_ORG_ID = 'mock-org-1';

export const BOX_COLORS: BoxColor[] = [
  { id: '1', name: 'Azul', hex: '#3b82f6' },
  { id: '2', name: 'Vermelho', hex: '#ef4444' },
  { id: '3', name: 'Verde', hex: '#22c55e' },
  { id: '4', name: 'Amarelo', hex: '#eab308' },
  { id: '5', name: 'Roxo', hex: '#a855f7' },
  { id: '6', name: 'Laranja', hex: '#f97316' },
  { id: '7', name: 'Cinza', hex: '#64748b' },
  { id: '8', name: 'Preto', hex: '#1e293b' },
  { id: '9', name: 'Rosa', hex: '#ec4899' },
  { id: '10', name: 'Branco', hex: '#ffffff' },
];

// Helper para definir cor do texto (Preto ou Branco) baseado no fundo
export const getContrastColor = (hexColor: string) => {
  if (!hexColor) return '#000000';
  // Remove # se houver
  const hex = hexColor.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calcula luminância (YIQ formula)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Se for escuro (< 128), texto branco. Senão, texto preto (slate-900).
  return yiq >= 128 ? '#0f172a' : '#ffffff';
};

export const MOCK_SECTORS: Sector[] = [
  { id: 's1', name: 'Recepção / Triagem' },
  { id: 's2', name: 'Gesso' },
  { id: 's3', name: 'CAD (Desenho)' },
  { id: 's4', name: 'CAM (Fresagem/Impressão)' },
  { id: 's5', name: 'Cerâmica / Acabamento' },
  { id: 's6', name: 'Controle de Qualidade' },
];

export const JOB_TYPES: JobType[] = [
  { 
    id: 't1', 
    name: 'Coroa de Zircônia', 
    category: 'Coroas', 
    basePrice: 450,
    variationGroups: [
      {
        id: 'g1',
        name: 'Material',
        selectionType: 'SINGLE',
        options: [
          { id: 'v1', name: 'Zircônia Translúcida', priceModifier: 0 },
          { id: 'v2', name: 'Zircônia Multilayer', priceModifier: 70 },
        ]
      },
      {
        id: 'g2',
        name: 'Adicionais de Implante',
        selectionType: 'MULTIPLE',
        options: [
          { id: 'v3', name: 'Pilar Personalizado', priceModifier: 150 },
          { id: 'v4', name: 'Parafuso de Titânio', priceModifier: 120 }
        ]
      }
    ]
  },
  { 
    id: 't2', 
    name: 'Lente E-Max', 
    category: 'Lentes', 
    basePrice: 550,
    variationGroups: [
       {
        id: 'g3',
        name: 'Técnica',
        selectionType: 'SINGLE',
        options: [
          { id: 'v5', name: 'Padrão (Injetada)', priceModifier: 0, disablesOptions: ['v7'] },
          { id: 'v6', name: 'Cut-back (Estratificada)', priceModifier: 80, disablesOptions: ['v7'] }
        ]
       },
       {
        id: 'g4',
        name: 'Adicionais de Implante', 
        selectionType: 'MULTIPLE',
        options: [
            { id: 'v7', name: 'Componente de Implante', priceModifier: 100 }
        ]
       }
    ]
  },
  { 
    id: 't3', 
    name: 'Prótese Total (PT)', 
    category: 'Próteses', 
    basePrice: 1200,
    variationGroups: []
  },
  { 
    id: 't4', 
    name: 'Metalocerâmica', 
    category: 'Coroas', 
    basePrice: 380,
    variationGroups: [
       { 
        id: 'g5', 
        name: 'Liga Metálica', 
        selectionType: 'SINGLE', 
        options: [
           { id: 'v8', name: 'Metal Precioso (Au)', priceModifier: 200 },
           { id: 'v9', name: 'Metal Não-Precioso (NiCr)', priceModifier: 0 }
        ]
       }
    ]
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@lab.com', role: UserRole.ADMIN },
  { id: 'u2', name: 'Gerente Marcos', email: 'manager@lab.com', role: UserRole.MANAGER },
  { id: 'u3', name: 'Operador João', email: 'ops@lab.com', role: UserRole.COLLABORATOR, sector: 'Cerâmica / Acabamento' },
  { id: 'u4', name: 'Dr. Silva', email: 'smith@clinic.com', role: UserRole.CLIENT, clinicName: 'Clínica Silva' },
];

const today = new Date();
const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    osNumber: '1001',
    patientName: 'Alice Souza',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.IN_PROGRESS,
    urgency: UrgencyLevel.NORMAL,
    items: [{ ...JOB_TYPES[0], quantity: 1, id: 'i1', jobTypeId: 't1', price: JOB_TYPES[0].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: yesterday,
    dueDate: tomorrow,
    boxNumber: '12',
    boxColor: BOX_COLORS[0],
    currentSector: 'Cerâmica / Acabamento',
    totalValue: 450
  },
  {
    id: 'j2',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    osNumber: '1002',
    patientName: 'Roberto Dias',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.WAITING_APPROVAL,
    urgency: UrgencyLevel.NORMAL,
    items: [{ ...JOB_TYPES[1], quantity: 2, id: 'i2', jobTypeId: 't2', price: JOB_TYPES[1].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: today,
    dueDate: new Date(today.getTime() + 86400000 * 5),
    totalValue: 1100
  },
  {
    id: 'j3',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    osNumber: '1003',
    patientName: 'Carlos Oliveira',
    dentistId: 'u4',
    dentistName: 'Dr. Silva',
    status: JobStatus.PENDING,
    urgency: UrgencyLevel.VIP,
    items: [{ ...JOB_TYPES[2], quantity: 1, id: 'i3', jobTypeId: 't3', price: JOB_TYPES[2].basePrice, selectedVariationIds: [] }],
    history: [],
    createdAt: yesterday,
    dueDate: today,
    boxNumber: '05',
    boxColor: BOX_COLORS[1],
    currentSector: 'Gesso',
    totalValue: 1200
  }
];

// --- MOCK CLINIC DATA ---

export const MOCK_PATIENTS: ClinicPatient[] = [
  {
    id: 'p1',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    dentistId: 'u4',
    name: 'Maria Oliveira',
    phone: '(11) 99999-1234',
    email: 'maria@email.com',
    createdAt: new Date('2023-01-15')
  },
  {
    id: 'p2',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    dentistId: 'u4',
    name: 'João Pedro',
    phone: '(11) 98888-5678',
    createdAt: new Date('2023-02-20')
  }
];

const apptTime1 = new Date(); apptTime1.setHours(10, 0, 0, 0);
const apptTime2 = new Date(); apptTime2.setHours(14, 30, 0, 0);
const apptTime3 = new Date(tomorrow); apptTime3.setHours(9, 0, 0, 0);

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    dentistId: 'u4',
    patientId: 'p1',
    patientName: 'Maria Oliveira',
    date: apptTime1,
    durationMinutes: 60,
    procedure: 'Avaliação Inicial',
    status: AppointmentStatus.COMPLETED
  },
  {
    id: 'a2',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    dentistId: 'u4',
    patientId: 'p2',
    patientName: 'João Pedro',
    date: apptTime2,
    durationMinutes: 30,
    procedure: 'Retorno',
    status: AppointmentStatus.SCHEDULED
  },
  {
    id: 'a3',
    // Fix: Added missing organizationId property.
    organizationId: MOCK_ORG_ID,
    dentistId: 'u4',
    patientId: 'p1',
    patientName: 'Maria Oliveira',
    date: apptTime3,
    durationMinutes: 90,
    procedure: 'Preparo Coroa',
    status: AppointmentStatus.SCHEDULED
  }
];