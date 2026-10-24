import { 
  Job, JobStatus, UrgencyLevel, UserRole, DeliveryRoute, RouteItem, ClinicPatient, 
  InventoryItem, Appointment, AppointmentStatus, ClinicService, ClinicDentist, 
  ClinicRoom, PatientPayment, ClinicBudget, SupplierOrder, LabCoupon 
} from '../types';

export const getReviewerSeedJobs = (orgId: string): Job[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

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
      status: JobStatus.IN_PROGRESS,
      urgency: UrgencyLevel.NORMAL,
      totalValue: 850.00,
      createdAt: threeDaysAgo,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
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
      currentSector: 'USINAGEM_CAD_CAM',
      sectorEntryTime: yesterday,
      history: [
        {
          id: 'hist-1',
          action: 'Caso recebido via aplicativo e registrado no sistema.',
          sector: 'RECEPCAO',
          timestamp: threeDaysAgo,
          userId: 'usr-rev-1',
          userName: 'Equipe de Recepção Review'
        },
        {
          id: 'hist-2',
          action: 'Usinagem de bloco de Zircônia iniciada.',
          sector: 'USINAGEM_CAD_CAM',
          timestamp: yesterday,
          userId: 'usr-rev-2',
          userName: 'Técnico CAD/CAM Review'
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
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
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
          action: 'Trabalho entregue com sucesso na clínica parceira.',
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
      osNumber: 'OS-8003 (R)',
      boxNumber: 'CX-05',
      patientName: 'Juliana Paes (Repetição Teste)',
      dentistId: 'dentist-rev-1',
      dentistName: 'Dr. Roberto Silva',
      clinicName: 'Clínica Odonto Prime Review',
      status: JobStatus.WAITING_APPROVAL,
      urgency: UrgencyLevel.VIP,
      totalValue: 420.00,
      createdAt: yesterday,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      items: [
        {
          id: 'item-103-1',
          jobTypeId: 'jt-e-max',
          name: 'Laminado Cerâmico E-Max CAD (Repetição)',
          quantity: 2,
          price: 210.00,
          nature: 'REPETITION',
          selectedVariationIds: [],
          selectedTeeth: ['14', '15'],
          color: 'A3'
        }
      ],
      currentSector: 'CONTROLE_QUALIDADE',
      history: [
        {
          id: 'hist-103-1',
          action: 'Aguardando aprovação de repetção pelo controle de qualidade.',
          sector: 'CONTROLE_QUALIDADE',
          timestamp: yesterday,
          userId: 'usr-rev-1',
          userName: 'Supervisão de Qualidade'
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

