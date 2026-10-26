import { 
  Job, JobStatus, UrgencyLevel, UserRole, DeliveryRoute, RouteItem, ClinicPatient, 
  InventoryItem, Appointment, AppointmentStatus, ClinicService, ClinicDentist, 
  ClinicRoom, PatientPayment, ClinicBudget, SupplierOrder, LabCoupon,
  ManualDentist, JobType, BoxColor, Sector, User, CommissionRecord, CommissionStatus,
  ALL_SYSTEM_PERMISSIONS, DentistPayment, isClinicReviewer, isSupplierReviewer, isReviewerUser
} from '../types';
import { db } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export const getReviewerSeedJobs = (orgId: string): Job[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'job-rev-101',
      organizationId: orgId,
      osNumber: 'OS-8001',
      boxNumber: 'CX-01',
      patientName: 'Carolina Mendes (Avaliador)',
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva (CRO 12345-SP)',
      clinicName: 'Clínica Odonto Prime Review',
      status: JobStatus.DELIVERED,
      urgency: UrgencyLevel.NORMAL,
      totalValue: 840.00,
      createdAt: fiveDaysAgo,
      dueDate: yesterday,
      deliveredAt: yesterday,
      isDelivered: true,
      deliveryConfirmed: true,
      items: [
        {
          id: 'item-101-1',
          jobTypeId: 'jt-zirconia',
          name: 'Coroa Metal Free Zircônia Pura Ultra 3D',
          quantity: 3,
          price: 280.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['11', '12', '21'],
          color: 'A2 (VITA Classic)'
        }
      ],
      currentSector: 'ENTREGA',
      sectorEntryTime: yesterday,
      history: [
        {
          id: 'hist-1',
          action: 'Caso recebido via aplicativo e registrado no sistema.',
          sector: 'RECEPCAO',
          timestamp: fiveDaysAgo,
          userId: 'usr-rev-1',
          userName: 'Equipe de Recepção Review'
        },
        {
          id: 'hist-2',
          action: 'Trabalho entregue com sucesso e assinado pelo Dr. Roberto Silva.',
          sector: 'ENTREGA',
          timestamp: yesterday,
          userId: 'usr-rev-3',
          userName: 'Logística Labprox'
        }
      ]
    },
    {
      id: 'job-rev-102',
      organizationId: orgId,
      osNumber: 'OS-8002',
      boxNumber: 'CX-02',
      patientName: 'Marcelo Oliveira (Avaliador)',
      dentistId: 'dentist-rev-2',
      dentistName: 'Dra. Fernanda Lima (CRO 98765-SP)',
      clinicName: 'Clínica Sorriso Aberto',
      status: JobStatus.DELIVERED,
      urgency: UrgencyLevel.HIGH,
      totalValue: 1250.00,
      createdAt: fiveDaysAgo,
      dueDate: yesterday,
      deliveredAt: yesterday,
      isDelivered: true,
      deliveryConfirmed: true,
      items: [
        {
          id: 'item-102-1',
          jobTypeId: 'jt-protocolo',
          name: 'Protocolo Superior Sobre Implante Zircônia',
          quantity: 1,
          price: 1250.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['46'],
          color: 'BL3 (Bleach)'
        }
      ],
      currentSector: 'ENTREGA',
      history: [
        {
          id: 'hist-102-1',
          action: 'Trabalho entregue com sucesso na clínica parceira (Faturamento Pendente).',
          sector: 'ENTREGA',
          timestamp: yesterday,
          userId: 'usr-rev-3',
          userName: 'Motoboy Lucas Review'
        }
      ]
    },
    {
      id: 'job-rev-103',
      organizationId: orgId,
      osNumber: 'OS-8003',
      boxNumber: 'CX-05',
      patientName: 'Juliana Paes (Avaliador)',
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva',
      clinicName: 'Clínica Odonto Prime Review',
      status: JobStatus.DELIVERED,
      urgency: UrgencyLevel.VIP,
      totalValue: 420.00,
      createdAt: threeDaysAgo,
      dueDate: yesterday,
      deliveredAt: yesterday,
      isDelivered: true,
      deliveryConfirmed: true,
      items: [
        {
          id: 'item-103-1',
          jobTypeId: 'jt-facetas-emax',
          name: 'Faceta / Lente de Contato Dental E-max Dissilicato',
          quantity: 2,
          price: 210.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['14', '15'],
          color: 'A1 (Bleach)'
        }
      ],
      currentSector: 'ENTREGA',
      history: [
        {
          id: 'hist-103-1',
          action: 'Trabalho entregue e recebido com sucesso.',
          sector: 'ENTREGA',
          timestamp: yesterday,
          userId: 'usr-rev-1',
          userName: 'Logística Labprox'
        }
      ]
    },
    {
      id: 'job-rev-104',
      organizationId: orgId,
      osNumber: 'OS-8004',
      boxNumber: 'CX-06',
      patientName: 'Thiago Siqueira (Avaliador)',
      dentistId: 'dentist-rev-2',
      dentistName: 'Dra. Fernanda Lima (CRO 98765-SP)',
      clinicName: 'Clínica Sorriso Aberto',
      status: JobStatus.DELIVERED,
      urgency: UrgencyLevel.HIGH,
      totalValue: 2400.00,
      createdAt: fiveDaysAgo,
      dueDate: yesterday,
      deliveredAt: yesterday,
      isDelivered: true,
      deliveryConfirmed: true,
      items: [
        {
          id: 'item-104-1',
          jobTypeId: 'jt-zirconia',
          name: 'Reabilitação em Zircônia Estética Anterior (8 Elementos)',
          quantity: 8,
          price: 300.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          selectedTeeth: ['11', '12', '13', '14', '21', '22', '23', '24'],
          color: 'BL2 (Ultra Bleach)'
        }
      ],
      currentSector: 'ENTREGA',
      history: [
        {
          id: 'hist-104-1',
          action: 'Entrega confirmada no consultório. Fatura em aberto.',
          sector: 'ENTREGA',
          timestamp: yesterday,
          userId: 'usr-rev-3',
          userName: 'Motoboy Lucas Review'
        }
      ]
    },
    {
      id: 'job-rev-105',
      organizationId: orgId,
      osNumber: 'OS-8005',
      boxNumber: 'CX-03',
      patientName: 'Renata Bezerra (Avaliador)',
      dentistId: 'dentist-rev-3',
      dentistName: 'Dr. Carlos Eduardo Mendes',
      clinicName: 'Instituto Reabilitar Oral',
      status: JobStatus.IN_PROGRESS,
      urgency: UrgencyLevel.NORMAL,
      totalValue: 580.00,
      createdAt: yesterday,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      items: [
        {
          id: 'item-105-1',
          jobTypeId: 'jt-protese-total',
          name: 'Prótese Total Bimaxilar Acrílica Premium',
          quantity: 1,
          price: 580.00,
          nature: 'NORMAL',
          selectedVariationIds: [],
          color: 'Rosa Médio com Caracterização'
        }
      ],
      currentSector: 'Cerâmica & Estratificação',
      history: [
        {
          id: 'hist-105-1',
          action: 'Montagem de dentes finalizada, em fase de acrilização.',
          sector: 'Cerâmica & Estratificação',
          timestamp: yesterday,
          userId: 'colab-rev-2',
          userName: 'Amanda Vasconcellos'
        }
      ]
    }
  ];
};

export const getReviewerSeedRoutes = (orgId: string): { route: DeliveryRoute; items: RouteItem[] } => {
  const now = new Date();
  const routeId = 'route-rev-001';

  return {
    route: {
      id: routeId,
      organizationId: orgId,
      date: now,
      shift: 'MORNING',
      driverName: 'Carlos Motoboy (Reviewer Express)',
      status: 'IN_TRANSIT',
      createdAt: now
    },
    items: [
      {
        id: 'item-rev-1',
        routeId: routeId,
        jobId: 'job-rev-101',
        dentistId: 'dentist-rev-1',
        dentistName: 'Dr. Roberto Silva',
        clinicName: 'Clínica Odonto Prime Review',
        patientName: 'Carolina Mendes (Avaliador)',
        address: 'Av. Paulista, 1000 - Cj 502, São Paulo - SP',
        type: 'DELIVERY',
        order: 1,
        observations: 'Deixar a caixa na recepção com a Sra. Amanda',
        addedByUserId: 'usr-rev-admin',
        addedByUserName: 'Avaliador App Store',
        addedAt: now
      },
      {
        id: 'item-rev-2',
        routeId: routeId,
        dentistId: 'dentist-rev-2',
        dentistName: 'Dra. Fernanda Lima',
        clinicName: 'Clínica Sorriso Aberto',
        patientName: 'Coleta de Moldagem Alginato',
        address: 'Rua Augusta, 450 - Sl 12, São Paulo - SP',
        type: 'PICKUP',
        order: 2,
        observations: 'Retirar moldeira metálica e caixa de silicone',
        addedByUserId: 'usr-rev-admin',
        addedByUserName: 'Avaliador App Store',
        addedAt: now
      }
    ]
  };
};

export const getReviewerSeedInventory = (orgId: string): InventoryItem[] => [
  {
    id: 'inv-rev-1',
    organizationId: orgId,
    name: 'Bloco de Zircônia Pura HT A2 (Usinagem CAD/CAM)',
    code: 'ZIRC-HT-A2',
    type: 'MATERIAL',
    currentStock: 48,
    minStock: 10,
    costPrice: 85.00,
    sellPrice: 280.00,
    isVisibleInStore: true,
    description: 'Bloco de zircônia odontológica de altíssima translucidez para restaurações estéticas.'
  },
  {
    id: 'inv-rev-2',
    organizationId: orgId,
    name: 'Resina Acrílica Autopolimerizável Rosa Médio 500g',
    code: 'RES-ROSA-500',
    type: 'SUPPLY',
    currentStock: 12,
    minStock: 5,
    costPrice: 42.00,
    sellPrice: 95.00,
    isVisibleInStore: true,
    description: 'Resina de alta estabilidade dimensional para confecção de placas e acrilização.'
  }
];

export const getReviewerSeedPatients = (orgId: string): ClinicPatient[] => {
  const now = new Date();
  return [
    {
      id: 'patient-rev-1',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      name: 'Mariana Costa (Paciente Teste)',
      cpf: '123.456.789-00',
      email: 'mariana.paciente@labprox.com.br',
      phone: '(11) 98888-7777',
      birthDate: '1992-05-14',
      clinicalAlerts: ['Alérgica a Penicilina'],
      createdAt: now
    },
    {
      id: 'patient-rev-2',
      organizationId: orgId,
      dentistId: 'dentist-rev-2',
      name: 'Lucas Eduardo Prado',
      cpf: '987.654.321-11',
      email: 'lucas.prado@labprox.com.br',
      phone: '(11) 97777-6666',
      birthDate: '1985-11-20',
      clinicalAlerts: ['Hipertensão Controlada'],
      createdAt: now
    },
    {
      id: 'patient-rev-3',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      name: 'Beatriz Vasconcellos Silva',
      cpf: '456.789.123-22',
      email: 'beatriz.silva@labprox.com.br',
      phone: '(11) 96666-5555',
      birthDate: '1998-03-28',
      clinicalAlerts: [],
      createdAt: now
    },
    {
      id: 'patient-rev-4',
      organizationId: orgId,
      dentistId: 'dentist-rev-2',
      name: 'Carlos Alberto Ferreira',
      cpf: '321.654.987-33',
      email: 'carlos.ferreira@labprox.com.br',
      phone: '(11) 95555-4444',
      birthDate: '1976-08-10',
      clinicalAlerts: ['Diabetes Tipo 2'],
      createdAt: now
    }
  ];
};

export const getReviewerClinicPatients = getReviewerSeedPatients;

// ==========================================
// REPOSITÓRIO MOCK: CLÍNICA ODONTOLÓGICA
// ==========================================

export const getReviewerClinicDentists = (orgId: string): ClinicDentist[] => [
  {
    id: 'dentist-rev-1',
    name: 'Dra. Juliana Prado',
    cro: 'CRO-SP 45.123',
    specialty: 'Prótese Dentária & Reabilitação',
    color: '#0284c7',
    active: true
  },
  {
    id: 'dentist-rev-2',
    name: 'Dr. Henrique Vasconcellos',
    cro: 'CRO-SP 89.234',
    specialty: 'Implantodontia & Estética Oral',
    color: '#10b981',
    active: true
  }
];

export const getReviewerClinicRooms = (orgId: string): ClinicRoom[] => [
  {
    id: 'room-rev-1',
    name: 'Consultório 01 (Implantes & CAD/CAM)',
    description: 'Equipado com scanner intraoral 3D e foco cirúrgico',
    active: true
  },
  {
    id: 'room-rev-2',
    name: 'Consultório 02 (Estética & Profilaxia)',
    description: 'Atendimento clínico geral, clareamento e restaurações',
    active: true
  }
];

export const getReviewerClinicServices = (orgId: string): ClinicService[] => [
  {
    id: 'srv-rev-1',
    name: 'Consulta de Avaliação & Diagnóstico 3D',
    category: 'Diagnóstico & Imagens',
    description: 'Escaneamento intraoral e planejamento digital do sorriso',
    price: 250.00,
    durationMinutes: 45,
    active: true
  },
  {
    id: 'srv-rev-2',
    name: 'Instalação de Coroa Cerâmica Zircônia Pura',
    category: 'Prótese Fixa & Reabilitação',
    description: 'Ajuste oclusal, cimentação e polimento estético',
    price: 1850.00,
    durationMinutes: 60,
    active: true
  },
  {
    id: 'srv-rev-3',
    name: 'Profilaxia Profissional com Ultrassom & Jato',
    category: 'Prevenção & Periodontia',
    description: 'Remoção de biofilme, raspagem supragengival e flúor',
    price: 320.00,
    durationMinutes: 30,
    active: true
  },
  {
    id: 'srv-rev-4',
    name: 'Restauração em Resina Composta Estética',
    category: 'Dentística Restauradora',
    description: 'Restauração direta fotopolimerizável com estratificação',
    price: 450.00,
    durationMinutes: 45,
    active: true
  }
];

export const getReviewerClinicAppointments = (orgId: string): Appointment[] => {
  const now = new Date();
  const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const todayMidday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 30, 0);
  const todayAfternoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  const tomorrowMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);

  return [
    {
      id: 'apt-rev-1',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      clinicDentistId: 'dentist-rev-1',
      patientId: 'patient-rev-1',
      patientName: 'Mariana Costa (Paciente Teste)',
      date: todayMorning,
      durationMinutes: 45,
      procedure: 'Instalação de Coroa Cerâmica Zircônia Pura',
      selectedTeeth: ['11', '12'],
      status: AppointmentStatus.CONFIRMED,
      notes: 'Paciente pontual, checar oclusão e guia anterior',
      roomId: 'room-rev-1'
    },
    {
      id: 'apt-rev-2',
      organizationId: orgId,
      dentistId: 'dentist-rev-2',
      clinicDentistId: 'dentist-rev-2',
      patientId: 'patient-rev-2',
      patientName: 'Lucas Eduardo Prado',
      date: todayMidday,
      durationMinutes: 30,
      procedure: 'Profilaxia Profissional com Ultrassom & Jato',
      selectedTeeth: [],
      status: AppointmentStatus.SCHEDULED,
      notes: 'Retorno preventivo semestral',
      roomId: 'room-rev-2'
    },
    {
      id: 'apt-rev-3',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      clinicDentistId: 'dentist-rev-1',
      patientId: 'patient-rev-3',
      patientName: 'Beatriz Vasconcellos Silva',
      date: todayAfternoon,
      durationMinutes: 60,
      procedure: 'Restauração em Resina Composta Estética',
      selectedTeeth: ['24', '25'],
      status: AppointmentStatus.CONFIRMED,
      notes: 'Estratificação de resina composta cor A1',
      roomId: 'room-rev-1'
    },
    {
      id: 'apt-rev-4',
      organizationId: orgId,
      dentistId: 'dentist-rev-2',
      clinicDentistId: 'dentist-rev-2',
      patientId: 'patient-rev-4',
      patientName: 'Carlos Alberto Ferreira',
      date: tomorrowMorning,
      durationMinutes: 45,
      procedure: 'Consulta de Avaliação & Diagnóstico 3D',
      selectedTeeth: [],
      status: AppointmentStatus.SCHEDULED,
      notes: 'Primeira consulta de planejamento reabilitador',
      roomId: 'room-rev-2'
    }
  ];
};

export const getReviewerClinicPatientPayments = (orgId: string): PatientPayment[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'pay-rev-1',
      organizationId: orgId,
      patientId: 'patient-rev-1',
      amount: 1850.00,
      paymentMethod: 'PIX',
      paymentDate: yesterday,
      createdAt: yesterday,
      type: 'PAYMENT',
      notes: 'Pagamento integral da coroa de zircônia via PIX'
    },
    {
      id: 'pay-rev-2',
      organizationId: orgId,
      patientId: 'patient-rev-3',
      amount: 450.00,
      paymentMethod: 'CREDIT_CARD',
      paymentDate: threeDaysAgo,
      createdAt: threeDaysAgo,
      type: 'PAYMENT',
      notes: 'Restauração dentes 24 e 25 (Cartão de Crédito 2x)'
    }
  ];
};

export const getReviewerClinicBudgets = (orgId: string): ClinicBudget[] => {
  const now = new Date();
  return [
    {
      id: 'bdg-rev-1',
      patientId: 'patient-rev-1',
      title: 'Tratamento Reabilitador Estético Anterior',
      amount: 3700.00,
      status: 'APPROVED',
      date: now,
      notes: 'Planejamento aprovado pelo paciente em 2 parcelas',
      items: [
        { description: '2x Coroa Zircônia Pura', qty: 2, value: 3700.00 }
      ],
      createdAt: now
    }
  ];
};

// ==========================================
// REPOSITÓRIO MOCK: FORNECEDOR DENTAL
// ==========================================

export const getReviewerSupplierProducts = (orgId: string): InventoryItem[] => [
  {
    id: 'sup-prod-1',
    organizationId: orgId,
    name: 'Resina Impressão 3D Odontológica Model 1kg Bege',
    code: 'RES-3D-MODEL-1KG',
    type: 'MATERIAL',
    currentStock: 85,
    minStock: 15,
    costPrice: 190.00,
    sellPrice: 349.90,
    isVisibleInStore: true,
    description: 'Resina fotopolimerizável de alta precisão e baixo encolhimento para confecção de modelos odontológicos.',
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'sup-prod-2',
    organizationId: orgId,
    name: 'Disco de Zircônia Multilayer 3D Pro 98mm A2',
    code: 'DISC-ZIRC-3DPRO',
    type: 'MATERIAL',
    currentStock: 42,
    minStock: 10,
    costPrice: 420.00,
    sellPrice: 789.00,
    isVisibleInStore: true,
    description: 'Gradiente natural de cor e translucidez de 57% incisal a 43% cervical para fresadoras CAD/CAM de 98mm.',
    imageUrl: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'sup-prod-3',
    organizationId: orgId,
    name: 'Fresa CAD/CAM Revestimento Diamantado 2.0mm',
    code: 'FRS-DIAM-20',
    type: 'MACHINERY',
    currentStock: 60,
    minStock: 20,
    costPrice: 85.00,
    sellPrice: 165.00,
    isVisibleInStore: true,
    description: 'Fresa de alto rendimento diamantada para desbaste rápido e preciso de blocos e discos de zircônia.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'sup-prod-4',
    organizationId: orgId,
    name: 'Silicone de Adição Pesada (Putty) + Leve (Light)',
    code: 'SIL-ADICAO-KIT',
    type: 'SUPPLY',
    currentStock: 35,
    minStock: 8,
    costPrice: 140.00,
    sellPrice: 289.00,
    isVisibleInStore: true,
    description: 'Kit de moldagem de altíssima fidelidade com estabilidade dimensional prolongada para próteses fixas.',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=500&q=80'
  },
  {
    id: 'sup-prod-5',
    organizationId: orgId,
    name: 'Gesso Especial Sintético Odontológico Tipo IV 5kg',
    code: 'GESSO-IV-5KG',
    type: 'MATERIAL',
    currentStock: 50,
    minStock: 12,
    costPrice: 45.00,
    sellPrice: 98.00,
    isVisibleInStore: true,
    description: 'Gesso tixotrópico de baixíssima expansão e superfície ultra-lisa para troquéis e prótese sobre implantes.',
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=500&q=80'
  }
];

export const getReviewerSupplierOrders = (orgId: string): SupplierOrder[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'ord-rev-5001',
      supplierId: orgId,
      supplierName: 'Dental Supplier Express (Review)',
      buyerOrgId: 'org-buyer-lab-1',
      buyerOrgName: 'Laboratório Prótese Dental Master',
      buyerName: 'Dr. Rodrigo Albuquerque',
      buyerEmail: 'rodrigo@labmaster.com.br',
      buyerPhone: '(11) 98765-4321',
      buyerCpfCnpj: '12.345.678/0001-90',
      totalValue: 1048.90,
      status: 'SEPARATION',
      deliveryStatus: 'SEPARATION',
      paymentStatus: 'PAID',
      paymentMethod: 'PIX',
      createdAt: yesterday,
      shippingMethod: 'SEDEX',
      shippingCost: 35.00,
      carrierName: 'Correios SEDEX',
      buyerAddress: {
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Conjunto 142',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      },
      items: [
        {
          productId: 'sup-prod-1',
          name: 'Resina Impressão 3D Odontológica Model 1kg Bege',
          quantity: 2,
          price: 349.90
        },
        {
          productId: 'sup-prod-4',
          name: 'Silicone de Adição Pesada (Putty) + Leve (Light)',
          quantity: 1,
          price: 289.00
        }
      ]
    },
    {
      id: 'ord-rev-5002',
      supplierId: orgId,
      supplierName: 'Dental Supplier Express (Review)',
      buyerOrgId: 'org-buyer-clinic-2',
      buyerOrgName: 'Clínica Odonto Prime Review',
      buyerName: 'Dra. Vanessa Martins',
      buyerEmail: 'vanessa@odontoprime.com.br',
      buyerPhone: '(11) 97654-3210',
      buyerCpfCnpj: '23.456.789/0001-01',
      totalValue: 789.00,
      status: 'READY_TO_SHIP',
      deliveryStatus: 'READY_TO_SHIP',
      paymentStatus: 'PAID',
      paymentMethod: 'CREDIT_CARD',
      createdAt: twoDaysAgo,
      separatedAt: yesterday,
      separatedBy: 'Operador Logístico Review',
      packedAt: yesterday,
      shippingMethod: 'FRENET',
      shippingCost: 28.50,
      carrierName: 'Jadlog Express',
      buyerAddress: {
        street: 'Rua Oscar Freire',
        number: '550',
        neighborhood: 'Cerqueira César',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01426-000'
      },
      items: [
        {
          productId: 'sup-prod-2',
          name: 'Disco de Zircônia Multilayer 3D Pro 98mm A2',
          quantity: 1,
          price: 789.00
        }
      ]
    },
    {
      id: 'ord-rev-5003',
      supplierId: orgId,
      supplierName: 'Dental Supplier Express (Review)',
      buyerOrgId: 'org-buyer-lab-3',
      buyerOrgName: 'Centro de Usinagem Dental CAD',
      buyerName: 'Marcos Vinicius Santos',
      buyerEmail: 'marcos@dentalcad.com.br',
      buyerPhone: '(19) 98123-4567',
      buyerCpfCnpj: '34.567.890/0001-12',
      totalValue: 495.00,
      status: 'SHIPPED',
      deliveryStatus: 'SHIPPED',
      paymentStatus: 'PAID',
      paymentMethod: 'PIX',
      createdAt: fourDaysAgo,
      shippedAt: twoDaysAgo,
      shippingMethod: 'SEDEX',
      shippingCost: 22.00,
      carrierName: 'Correios SEDEX',
      trackingCode: 'NL987654321BR',
      trackingUrl: 'https://rastreamento.correios.com.br/app/index.php?codigo=NL987654321BR',
      buyerAddress: {
        street: 'Rua Barão de Jaguara',
        number: '120',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        zipCode: '13015-001'
      },
      items: [
        {
          productId: 'sup-prod-3',
          name: 'Fresa CAD/CAM Revestimento Diamantado 2.0mm',
          quantity: 3,
          price: 165.00
        }
      ]
    }
  ];
};

export const getReviewerSupplierCoupons = (orgId: string): LabCoupon[] => [
  {
    id: 'cpn-rev-1',
    organizationId: orgId,
    code: 'BEMVINDO10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    validUntil: '2028-12-31',
    maxUses: 100,
    usedCount: 14,
    active: true
  },
  {
    id: 'cpn-rev-2',
    organizationId: orgId,
    code: 'PROMOFRETE',
    discountType: 'FIXED',
    discountValue: 50,
    validUntil: '2028-12-31',
    maxUses: 50,
    usedCount: 8,
    active: true
  }
];

// ==========================================
// REPOSITÓRIO MOCK: LABORATÓRIO ODONTOLÓGICO
// Clientes, Serviços, Caixas, Setores, Equipe e Comissões
// ==========================================

export const getReviewerLabDentists = (orgId: string): ManualDentist[] => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'dentist-rev-1',
      organizationId: orgId,
      name: 'Dr. Roberto Silva',
      clinicName: 'Clínica Odonto Prime Review',
      clientType: 'CLINICA',
      cro: 'CRO-SP 12345',
      phone: '(11) 98888-1111',
      whatsapp: '11988881111',
      email: 'roberto.silva@odontoprime.com.br',
      cpfCnpj: '12.345.678/0001-99',
      address: 'Avenida Paulista',
      number: '1500',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      cep: '01310-200',
      billingLimit: 15000,
      globalDiscountPercent: 5,
      isBlocked: false,
      createdAt: thirtyDaysAgo
    },
    {
      id: 'dentist-rev-2',
      organizationId: orgId,
      name: 'Dra. Fernanda Lima',
      clinicName: 'Clínica Sorriso Aberto',
      clientType: 'CLINICA',
      cro: 'CRO-SP 98765',
      phone: '(11) 97777-2222',
      whatsapp: '11977772222',
      email: 'fernanda.lima@sorrisoaberto.com.br',
      cpfCnpj: '98.765.432/0001-88',
      address: 'Rua Domingos de Morais',
      number: '820',
      neighborhood: 'Vila Mariana',
      city: 'São Paulo',
      state: 'SP',
      cep: '04010-000',
      billingLimit: 3000,
      globalDiscountPercent: 0,
      isBlocked: true,
      blockReason: 'DEBT',
      createdAt: thirtyDaysAgo
    },
    {
      id: 'dentist-rev-3',
      organizationId: orgId,
      name: 'Dr. Carlos Eduardo Mendes',
      clinicName: 'Instituto Reabilitar Oral',
      clientType: 'PESSOA_FISICA',
      cro: 'CRO-SP 54321',
      phone: '(11) 96666-3333',
      whatsapp: '11966663333',
      email: 'carlos.mendes@reabilitaroral.com.br',
      cpfCnpj: '321.654.987-00',
      address: 'Alameda Santos',
      number: '450',
      neighborhood: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      cep: '01418-000',
      billingLimit: 20000,
      globalDiscountPercent: 10,
      isBlocked: false,
      createdAt: thirtyDaysAgo
    },
    {
      id: 'dentist-rev-4',
      organizationId: orgId,
      name: 'Dra. Camila Nogueira',
      clinicName: 'Odonto Estética Alphaville',
      clientType: 'CLINICA',
      cro: 'CRO-SP 67890',
      phone: '(11) 95555-4444',
      whatsapp: '11955554444',
      email: 'camila.nogueira@esteticaalphaville.com.br',
      cpfCnpj: '45.678.901/0001-77',
      address: 'Alameda Rio Negro',
      number: '1030',
      neighborhood: 'Alphaville Industrial',
      city: 'Barueri',
      state: 'SP',
      cep: '06454-000',
      billingLimit: 25000,
      globalDiscountPercent: 5,
      isBlocked: false,
      createdAt: thirtyDaysAgo
    },
    {
      id: 'dentist-rev-5',
      organizationId: orgId,
      name: 'Dr. André Guimarães',
      clinicName: 'Centro Odontológico Guimarães & Implantes',
      clientType: 'CLINICA',
      cro: 'CRO-SP 88123',
      phone: '(11) 94444-9999',
      whatsapp: '11944449999',
      email: 'andre.guimaraes@odontoguimaraes.com.br',
      cpfCnpj: '67.890.123/0001-55',
      address: 'Rua Bela Cintra',
      number: '920',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      cep: '01415-000',
      billingLimit: 18000,
      globalDiscountPercent: 0,
      isBlocked: false,
      createdAt: thirtyDaysAgo
    }
  ];
};

export const getReviewerLabDentistPayments = (orgId: string): DentistPayment[] => {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'pay-rev-1',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva',
      amount: 840.00,
      paymentMethod: 'PIX',
      paymentDate: fiveDaysAgo,
      type: 'PAYMENT',
      notes: 'Quitação integral OS-8001 via PIX Chave CNPJ',
      createdAt: fiveDaysAgo
    },
    {
      id: 'pay-rev-2',
      organizationId: orgId,
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva',
      amount: 420.00,
      paymentMethod: 'CREDIT_CARD',
      paymentDate: twoDaysAgo,
      type: 'PAYMENT',
      notes: 'Quitação OS-8003 no Cartão de Crédito em 2x',
      createdAt: twoDaysAgo
    }
  ];
};

export const getReviewerLabJobTypes = (orgId: string): JobType[] => [
  {
    id: 'jt-zirconia',
    name: 'Coroa Cerâmica Zircônia Pura Ultra CAD/CAM',
    category: 'Prótese Fixa',
    description: 'Usinagem em zircônia translúcida com anatomia oclusal e glaze cerâmico.',
    basePrice: 280.00,
    baseCommission: 28.00,
    productionTimeDays: 3,
    variationGroups: [
      {
        id: 'vg-cor-zirc',
        name: 'Escala de Cor VITA',
        selectionType: 'SINGLE',
        options: [
          { id: 'opt-a1', name: 'A1', priceModifier: 0 },
          { id: 'opt-a2', name: 'A2 (Mais Usada)', priceModifier: 0 },
          { id: 'opt-a3', name: 'A3', priceModifier: 0 },
          { id: 'opt-bl2', name: 'BL2 Bleach', priceModifier: 20 }
        ]
      }
    ],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['CAD / CAM & Escaneamento', 'Cerâmica & Estratificação', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-facetas-emax',
    name: 'Lente de Contato Dental E-max Dissilicato',
    category: 'Estética & Lentes',
    description: 'Lente ultrafina de dissilicato de lítio maquiada e prensada de altíssima translucidez.',
    basePrice: 320.00,
    baseCommission: 35.00,
    productionTimeDays: 2,
    variationGroups: [
      {
        id: 'vg-espessura',
        name: 'Espessura Mínima',
        selectionType: 'SINGLE',
        options: [
          { id: 'opt-03mm', name: '0.3mm Ultrafina', priceModifier: 30 },
          { id: 'opt-05mm', name: '0.5mm Padrão', priceModifier: 0 }
        ]
      }
    ],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['CAD / CAM & Escaneamento', 'Cerâmica & Estratificação', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-placa-miox',
    name: 'Placa Miorrelaxante de Bruxismo em Acetato Rígida',
    category: 'Ortodontia & Placas',
    description: 'Placa estabilizadora prensada a vácuo com alívio canino e guia anterior ajustada.',
    basePrice: 95.00,
    baseCommission: 12.00,
    productionTimeDays: 1,
    variationGroups: [
      {
        id: 'vg-arcada',
        name: 'Arcada Alvo',
        selectionType: 'SINGLE',
        options: [
          { id: 'opt-sup', name: 'Arcada Superior', priceModifier: 0 },
          { id: 'opt-inf', name: 'Arcada Inferior', priceModifier: 0 }
        ]
      }
    ],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['Gesso & Modelos', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-protocolo',
    name: 'Protocolo Superior em Zircônia sobre Implante',
    category: 'Prótese sobre Implante',
    description: 'Barra usinada em zircônia pura com orifícios de parafuso passivo e gengiva rosa estratificada.',
    basePrice: 1250.00,
    baseCommission: 125.00,
    productionTimeDays: 5,
    variationGroups: [
      {
        id: 'vg-fixacao',
        name: 'Tipo de Conexão',
        selectionType: 'SINGLE',
        options: [
          { id: 'opt-cone-morse', name: 'Cone Morse Mini Pilar', priceModifier: 0 },
          { id: 'opt-he', name: 'Hexágono Externo', priceModifier: 0 }
        ]
      }
    ],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['Gesso & Modelos', 'CAD / CAM & Escaneamento', 'Cerâmica & Estratificação', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-guia-cirurgico',
    name: 'Guia Cirúrgico para Implantes com Anilha CAD/CAM',
    category: 'Cirurgia Guiada',
    description: 'Guia cirúrgico de precisão desenhado a partir de tomografia DICOM e escaneamento intraoral STL.',
    basePrice: 190.00,
    baseCommission: 20.00,
    productionTimeDays: 2,
    variationGroups: [
      {
        id: 'vg-anilhas',
        name: 'Quantidade de Anilhas',
        selectionType: 'SINGLE',
        options: [
          { id: 'opt-1-3', name: '1 a 3 Implantes', priceModifier: 0 },
          { id: 'opt-4-mais', name: '4 ou mais Implantes', priceModifier: 80 }
        ]
      }
    ],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['CAD / CAM & Escaneamento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-metaloceramica',
    name: 'Coroa Metalocerâmica Co-Cr Clássica',
    category: 'Prótese Fixa',
    description: 'Subestrutura em liga nobre Co-Cr fundida com cerâmica feldspática de alta aderência.',
    basePrice: 180.00,
    baseCommission: 18.00,
    productionTimeDays: 3,
    variationGroups: [],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['Gesso & Modelos', 'Cerâmica & Estratificação', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-ppr-metalica',
    name: 'Prótese Parcial Removível (PPR) com Grampos Co-Cr',
    category: 'Prótese Removível',
    description: 'Armação metálica fundida de cobalto-cromo com grampos circunferenciais e montagem acrílica.',
    basePrice: 450.00,
    baseCommission: 45.00,
    productionTimeDays: 4,
    variationGroups: [],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['Gesso & Modelos', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-protese-total',
    name: 'Prótese Total Bimaxilar Acrílica Premium',
    category: 'Prótese Total',
    description: 'Montagem de dentes de alta resistência com caracterização gengival e acrilização prensada.',
    basePrice: 580.00,
    baseCommission: 58.00,
    productionTimeDays: 4,
    variationGroups: [],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['Gesso & Modelos', 'Acabamento & Polimento', 'Controle de Qualidade'],
    imageUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jt-inlay-onlay',
    name: 'Inlay / Onlay Cerâmico E-max Maquiado',
    category: 'Estética & Lentes',
    description: 'Restauração indireta inlay/onlay de dissilicato de lítio usinada para máxima adaptação marginal.',
    basePrice: 260.00,
    baseCommission: 26.00,
    productionTimeDays: 2,
    variationGroups: [],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['CAD / CAM & Escaneamento', 'Cerâmica & Estratificação', 'Acabamento & Polimento', 'Controle de Qualidade']
  },
  {
    id: 'jt-provisorio-pmma',
    name: 'Provisório em Resina PMMA Multicamadas Fresado',
    category: 'Prótese Fixa',
    description: 'Coroa provisória usinada em bloco PMMA multicamadas com alta precisão anatômica.',
    basePrice: 75.00,
    baseCommission: 8.00,
    productionTimeDays: 1,
    variationGroups: [],
    isVisibleInStore: true,
    isVisibleInternally: true,
    allowedSectors: ['CAD / CAM & Escaneamento', 'Acabamento & Polimento', 'Controle de Qualidade']
  }
];

export const getReviewerLabBoxColors = (orgId: string): BoxColor[] => [
  { id: 'box-color-blue', name: 'Azul Padrão (Normal)', hex: '#2563EB' },
  { id: 'box-color-green', name: 'Verde (Pronto p/ Entrega)', hex: '#10B981' },
  { id: 'box-color-yellow', name: 'Amarelo (Prova / Atenção)', hex: '#F59E0B' },
  { id: 'box-color-red', name: 'Vermelho (Urgência / VIP)', hex: '#EF4444' },
  { id: 'box-color-purple', name: 'Roxo (Implantes Especiais)', hex: '#8B5CF6' }
];

export const getReviewerLabSectors = (orgId: string): Sector[] => [
  {
    id: 'sec-gesso',
    name: 'Gesso & Modelos',
    stages: ['Vazamento de Gesso', 'Troquelização', 'Articulação']
  },
  {
    id: 'sec-cadcam',
    name: 'CAD / CAM & Escaneamento',
    stages: ['Escaneamento 3D', 'Desenho Digital Exocad', 'Usinagem de Zircônia']
  },
  {
    id: 'sec-ceramica',
    name: 'Cerâmica & Estratificação',
    stages: ['Aplicação Cerâmica', 'Queima de Glaze', 'Maquiagem Estética']
  },
  {
    id: 'sec-acabamento',
    name: 'Acabamento & Polimento',
    stages: ['Ajuste Oclusal', 'Polimento Alto Brilho', 'Limpeza Ultrassônica']
  },
  {
    id: 'sec-qualidade',
    name: 'Controle de Qualidade',
    stages: ['Inspeção Dimensional', 'Prova no Modelo', 'Liberação Final']
  },
  {
    id: 'sec-expedicao',
    name: 'Expedição & Logística',
    stages: ['Embalagem Protegida', 'Etiquetagem de Caixa', 'Despacho com Motoboy']
  }
];

export const getReviewerLabCollaborators = (orgId: string): User[] => {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'colab-rev-admin',
      organizationId: orgId,
      name: 'Dr. Marcelo Rezende (Administrador Geral)',
      email: 'marcelo.admin@labprox.com.br',
      phone: '(11) 98000-1122',
      role: UserRole.ADMIN,
      sector: 'Administração',
      sectors: ['Administração', 'Controle de Qualidade'],
      permissions: ALL_SYSTEM_PERMISSIONS,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      createdAt: sixtyDaysAgo
    },
    {
      id: 'colab-rev-1',
      organizationId: orgId,
      name: 'Lucas Medeiros (Projetista CAD/CAM)',
      email: 'lucas.cad@labprox.com.br',
      phone: '(11) 98111-2233',
      role: UserRole.COLLABORATOR,
      sector: 'CAD / CAM & Escaneamento',
      sectors: ['CAD / CAM & Escaneamento'],
      permissions: ALL_SYSTEM_PERMISSIONS,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
      createdAt: sixtyDaysAgo
    },
    {
      id: 'colab-rev-2',
      organizationId: orgId,
      name: 'Amanda Vasconcellos (Ceramista Sênior)',
      email: 'amanda.ceramista@labprox.com.br',
      phone: '(11) 98222-3344',
      role: UserRole.COLLABORATOR,
      sector: 'Cerâmica & Estratificação',
      sectors: ['Cerâmica & Estratificação'],
      permissions: ALL_SYSTEM_PERMISSIONS,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
      createdAt: sixtyDaysAgo
    },
    {
      id: 'colab-rev-3',
      organizationId: orgId,
      name: 'Gabriel Martins (Técnico de Gesso)',
      email: 'gabriel.gesso@labprox.com.br',
      phone: '(11) 98333-4455',
      role: UserRole.COLLABORATOR,
      sector: 'Gesso & Modelos',
      sectors: ['Gesso & Modelos'],
      permissions: ALL_SYSTEM_PERMISSIONS,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=256&q=80',
      createdAt: sixtyDaysAgo
    }
  ];
};

export const getReviewerLabCommissions = (orgId: string): CommissionRecord[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

  return [
    {
      id: 'comm-rev-1',
      userId: 'colab-rev-1',
      userName: 'Lucas Medeiros (Projetista CAD/CAM)',
      jobId: 'job-rev-101',
      osNumber: 'OS-8001',
      patientName: 'Carolina Mendes (Avaliador)',
      amount: 84.00,
      status: CommissionStatus.PAID,
      createdAt: threeDaysAgo,
      paidAt: yesterday,
      sector: 'CAD / CAM & Escaneamento',
      itemName: 'Coroa Cerâmica Zircônia Pura Ultra 3D',
      stageName: 'Usinagem de Zircônia',
      quantity: 3
    },
    {
      id: 'comm-rev-2',
      userId: 'colab-rev-1',
      userName: 'Lucas Medeiros (Projetista CAD/CAM)',
      jobId: 'job-rev-102',
      osNumber: 'OS-8002',
      patientName: 'Marcelo Oliveira (Avaliador)',
      amount: 125.00,
      status: CommissionStatus.PENDING,
      createdAt: twoDaysAgo,
      sector: 'CAD / CAM & Escaneamento',
      itemName: 'Protocolo Superior Sobre Implante Zircônia',
      stageName: 'Desenho Digital Exocad',
      quantity: 1
    },
    {
      id: 'comm-rev-3',
      userId: 'colab-rev-2',
      userName: 'Amanda Vasconcellos (Ceramista Sênior)',
      jobId: 'job-rev-101',
      osNumber: 'OS-8001',
      patientName: 'Carolina Mendes (Avaliador)',
      amount: 150.00,
      status: CommissionStatus.PAID,
      createdAt: twoDaysAgo,
      paidAt: yesterday,
      sector: 'Cerâmica & Estratificação',
      itemName: 'Coroa Cerâmica Zircônia Pura Ultra 3D',
      stageName: 'Aplicação Cerâmica & Maquiagem',
      quantity: 3
    },
    {
      id: 'comm-rev-4',
      userId: 'colab-rev-2',
      userName: 'Amanda Vasconcellos (Ceramista Sênior)',
      jobId: 'job-rev-103',
      osNumber: 'OS-8003',
      patientName: 'Patrícia Albuquerque (Avaliador)',
      amount: 75.00,
      status: CommissionStatus.PENDING,
      createdAt: yesterday,
      sector: 'Cerâmica & Estratificação',
      itemName: 'Faceta E-max Estética',
      stageName: 'Queima de Glaze',
      quantity: 2
    },
    {
      id: 'comm-rev-5',
      userId: 'colab-rev-3',
      userName: 'Gabriel Martins (Técnico de Gesso)',
      jobId: 'job-rev-101',
      osNumber: 'OS-8001',
      patientName: 'Carolina Mendes (Avaliador)',
      amount: 45.00,
      status: CommissionStatus.PAID,
      createdAt: fourDaysAgo,
      paidAt: twoDaysAgo,
      sector: 'Gesso & Modelos',
      itemName: 'Troquelização de Modelo 3D',
      stageName: 'Troquelização',
      quantity: 3
    },
    {
      id: 'comm-rev-6',
      userId: 'colab-rev-4',
      userName: 'Rafael Souza (Polimento & Acabamento)',
      jobId: 'job-rev-102',
      osNumber: 'OS-8002',
      patientName: 'Marcelo Oliveira (Avaliador)',
      amount: 60.00,
      status: CommissionStatus.PENDING,
      createdAt: yesterday,
      sector: 'Acabamento & Polimento',
      itemName: 'Polimento de Alto Brilho em Zircônia',
      stageName: 'Polimento Alto Brilho',
      quantity: 1
    }
  ];
};

const cleanPayload = (obj: any): any => {
  if (obj === undefined || obj === null) return null;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(cleanPayload);
  if (typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanPayload(v);
      }
    }
    return res;
  }
  return obj;
};

let isSeeding = false;
export const ensureReviewerDatabaseSeeded = async (orgId?: string, email?: string): Promise<void> => {
  if (!db || isSeeding) return;
  const cleanEmail = (email || '').toLowerCase().trim();
  isSeeding = true;

  try {
    if (isClinicReviewer(cleanEmail)) {
      const targetOrg = orgId || 'org_reviewer_clinic';
      await setDoc(doc(db, 'organizations', targetOrg), {
        id: targetOrg,
        name: 'Clínica Odontológica Review',
        tradeName: 'Clínica Odonto Review',
        cnpj: '11.222.333/0001-44',
        email: cleanEmail,
        phone: '(11) 98888-7777',
        orgType: 'CLINIC',
        status: 'ACTIVE',
        planId: 'super_plan',
        updatedAt: new Date()
      }, { merge: true });

      for (const p of getReviewerClinicPatients(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/patients`, p.id), cleanPayload(p), { merge: true });
      }
      for (const a of getReviewerClinicAppointments(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/appointments`, a.id), cleanPayload(a), { merge: true });
      }
      for (const s of getReviewerClinicServices(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/clinicServices`, s.id), cleanPayload(s), { merge: true });
      }
      for (const r of getReviewerClinicRooms(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/clinicRooms`, r.id), cleanPayload(r), { merge: true });
      }
      for (const d of getReviewerClinicDentists(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/clinicDentists`, d.id), cleanPayload(d), { merge: true });
      }
      for (const pay of getReviewerClinicPatientPayments(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/patientPayments`, pay.id), cleanPayload(pay), { merge: true });
      }
      return;
    }

    if (isSupplierReviewer(cleanEmail)) {
      const targetOrg = orgId || 'org_reviewer_supplier';
      await setDoc(doc(db, 'organizations', targetOrg), {
        id: targetOrg,
        name: 'Dental Supplier Express (Demo Avaliação)',
        tradeName: 'Dental Supplier Review',
        cnpj: '22.333.444/0001-55',
        email: cleanEmail,
        phone: '(11) 97777-8888',
        orgType: 'SUPPLIER',
        status: 'ACTIVE',
        planId: 'super_plan',
        updatedAt: new Date()
      }, { merge: true });

      for (const p of getReviewerSupplierProducts(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/inventoryItems`, p.id), cleanPayload(p), { merge: true });
      }
      for (const o of getReviewerSupplierOrders(targetOrg)) {
        await setDoc(doc(db, 'supplierOrders', o.id), cleanPayload(o), { merge: true });
      }
      for (const c of getReviewerSupplierCoupons(targetOrg)) {
        await setDoc(doc(db, `organizations/${targetOrg}/labCoupons`, c.id), cleanPayload(c), { merge: true });
      }
      return;
    }

    // Default: Lab Reviewer (avaliador@labprox.com.br, apple.review@labprox.com.br, etc.)
    const targetOrg = orgId || 'org_reviewer_demo';
    await setDoc(doc(db, 'organizations', targetOrg), {
      id: targetOrg,
      name: 'Labprox Dental Lab (Demo Avaliação)',
      tradeName: 'Labprox Demo',
      cnpj: '00.000.000/0001-99',
      email: cleanEmail || 'avaliador@labprox.com.br',
      phone: '(11) 99999-8888',
      orgType: 'LAB',
      status: 'ACTIVE',
      planId: 'super_plan',
      updatedAt: new Date()
    }, { merge: true });

    // 1. Serviços (Catálogo completo de 10 serviços)
    for (const jt of getReviewerLabJobTypes(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/jobTypes`, jt.id), cleanPayload(jt), { merge: true });
    }

    // 2. Dentistas / Clientes (5 clientes com pagamentos e saldo devedor)
    for (const d of getReviewerLabDentists(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/manualDentists`, d.id), cleanPayload(d), { merge: true });
    }

    // 3. Setores do laboratório
    for (const s of getReviewerLabSectors(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/sectors`, s.id), cleanPayload(s), { merge: true });
    }

    // 4. Cores das caixas
    for (const b of getReviewerLabBoxColors(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/boxColors`, b.id), cleanPayload(b), { merge: true });
    }

    // 5. Trabalhos / OSs
    for (const j of getReviewerSeedJobs(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/jobs`, j.id), cleanPayload(j), { merge: true });
    }

    // 6. Pagamentos de dentistas
    for (const p of getReviewerLabDentistPayments(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/dentistPayments`, p.id), cleanPayload(p), { merge: true });
    }

    // 7. Comissões dos colaboradores
    for (const c of getReviewerLabCommissions(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/commissions`, c.id), cleanPayload(c), { merge: true });
    }

    // 8. Colaboradores da equipe (users)
    for (const u of getReviewerLabCollaborators(targetOrg)) {
      await setDoc(doc(db, 'users', u.id), cleanPayload(u), { merge: true });
    }

    // 9. Rotas de entrega
    const { route, items } = getReviewerSeedRoutes(targetOrg);
    await setDoc(doc(db, `organizations/${targetOrg}/routes`, route.id), cleanPayload(route), { merge: true });
    for (const it of items) {
      await setDoc(doc(db, `organizations/${targetOrg}/routes/${route.id}/items`, it.id), cleanPayload(it), { merge: true });
    }

    // 10. Estoque inicial
    for (const inv of getReviewerSeedInventory(targetOrg)) {
      await setDoc(doc(db, `organizations/${targetOrg}/inventoryItems`, inv.id), cleanPayload(inv), { merge: true });
    }
  } catch (err) {
    console.warn('[ReviewerSeed] Silently handled seeding error:', err);
  } finally {
    isSeeding = false;
  }
};



