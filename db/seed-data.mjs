// Sample projects for local development. Amounts are net EUR; the runner converts them to cents.
// VAT is applied per project country: Spain 21%, Italy 22%.

export const VAT_RATE = { ES: 0.21, IT: 0.22 };

export const projects = [
  {
    key: "madrid",
    name: "Reforma integral piso Calle Alcalá 45",
    clientName: "Inmobiliaria Torres S.L.",
    budgetEur: 185000,
    status: "active",
    country: "ES",
  },
  {
    key: "getafe",
    name: "Ampliación nave logística Getafe",
    clientName: "Logística Mendoza S.A.",
    budgetEur: 420000,
    status: "active",
    country: "ES",
  },
  {
    key: "milano",
    name: "Ristrutturazione bagno e cucina Via Brera 12",
    clientName: "Studio Bianchi Architetti",
    budgetEur: 68500,
    status: "completed",
    country: "IT",
  },
];

// project: key from `projects`. amountEur: net amount before VAT.
export const costs = [
  // Madrid
  { project: "madrid", category: "materials", supplier: "Materiales Hermanos Ruiz S.L.", description: "Tabiquería pladur y perfiles", amountEur: 1280.4, costDate: "2025-02-03", source: "manual", status: "confirmed" },
  { project: "madrid", category: "materials", supplier: "Cerámicas Levante", description: "Azulejo baño 30x60 (24 m²)", amountEur: 1864, costDate: "2025-02-10", source: "ai_extracted", status: "needs_review" },
  { project: "madrid", category: "labour", supplier: "Obras Gil", description: "Demolición y retirada de escombros", amountEur: 2400, costDate: "2025-02-05", source: "manual", status: "confirmed" },
  { project: "madrid", category: "subcontractor", supplier: "Electricidad Benítez S.L.", description: "Instalación eléctrica completa vivienda", amountEur: 6850, costDate: "2025-03-01", source: "manual", status: "confirmed" },
  { project: "madrid", category: "subcontractor", supplier: "Fontanería Moreno", description: "Red de fontanería y saneamiento baño y cocina", amountEur: 4120.5, costDate: "2025-03-04", source: "ai_extracted", status: "needs_review" },
  { project: "madrid", category: "materials", supplier: "Pinturas Iberia", description: "Pintura plástica e imprimación (6 estancias)", amountEur: 486.9, costDate: "2025-04-12", source: "ai_extracted", status: "needs_review" },
  { project: "madrid", category: "materials", supplier: "Ferretería Gómez", description: "Tornillería, silicona y fijaciones", amountEur: 212.35, costDate: "2025-03-18", source: "manual", status: "confirmed" },
  { project: "madrid", category: "other", supplier: "Contenedores Madrid Sur", description: "Contenedor 6 m³ para escombros", amountEur: 390, costDate: "2025-02-06", source: "manual", status: "confirmed" },
  { project: "madrid", category: "labour", supplier: "Obras Gil", description: "Mano de obra alicatado y solado (3 semanas)", amountEur: 5200, costDate: "2025-03-25", source: "manual", status: "confirmed" },
  { project: "madrid", category: "materials", supplier: "Carpintería Lozano", description: "Puertas interiores lacadas (4 uds)", amountEur: 2150, costDate: "2025-05-02", source: "ai_extracted", status: "needs_review" },

  // Getafe
  { project: "getafe", category: "materials", supplier: "Hormigones Sur S.A.", description: "Hormigón HA-25 para solera (62 m³)", amountEur: 9610, costDate: "2025-06-12", source: "ai_extracted", status: "needs_review" },
  { project: "getafe", category: "materials", supplier: "Aceros Castilla", description: "Mallazo y armaduras B500S", amountEur: 14750.25, costDate: "2025-06-08", source: "manual", status: "confirmed" },
  { project: "getafe", category: "subcontractor", supplier: "Estructuras Metálicas Ibérica", description: "Montaje de estructura metálica de la nave", amountEur: 58400, costDate: "2025-07-22", source: "manual", status: "confirmed" },
  { project: "getafe", category: "labour", supplier: "Construcciones Ortega", description: "Mano de obra de encofrado y hormigonado", amountEur: 18900, costDate: "2025-06-15", source: "manual", status: "confirmed" },
  { project: "getafe", category: "subcontractor", supplier: "Cubiertas Levante S.L.", description: "Cubierta de panel sándwich (1.200 m²)", amountEur: 36200, costDate: "2025-08-30", source: "ai_extracted", status: "needs_review" },
  { project: "getafe", category: "materials", supplier: "Puertas Industriales Castilla", description: "Puertas seccionales industriales (3 uds)", amountEur: 11400, costDate: "2025-09-10", source: "manual", status: "confirmed" },
  { project: "getafe", category: "other", supplier: "Gestión de Residuos Getafe", description: "Retirada de tierras y sobrantes", amountEur: 1750, costDate: "2025-06-02", source: "manual", status: "confirmed" },
  { project: "getafe", category: "subcontractor", supplier: "Electricidad Benítez S.L.", description: "Cuadro eléctrico y alumbrado industrial", amountEur: 22300, costDate: "2025-09-25", source: "ai_extracted", status: "needs_review" },
  { project: "getafe", category: "materials", supplier: "Pinturas Iberia", description: "Pavimento epoxi zona de almacén (900 m²)", amountEur: 8640, costDate: "2025-10-05", source: "manual", status: "confirmed" },
  { project: "getafe", category: "labour", supplier: "Construcciones Ortega", description: "Mano de obra de cerramientos", amountEur: 7450, costDate: "2025-08-18", source: "manual", status: "confirmed" },

  // Milano
  { project: "milano", category: "materials", supplier: "Ceramiche Emilia S.p.A.", description: "Gres porcellanato bagno e cucina (38 m²)", amountEur: 2340, costDate: "2024-10-10", source: "manual", status: "confirmed" },
  { project: "milano", category: "materials", supplier: "Colorificio Verdi S.r.l.", description: "Pittura lavabile e stucco", amountEur: 412.8, costDate: "2024-11-20", source: "manual", status: "confirmed" },
  { project: "milano", category: "subcontractor", supplier: "Idraulica Ferrari S.n.c.", description: "Rifacimento impianto idrico e scarichi", amountEur: 6200, costDate: "2024-10-28", source: "manual", status: "confirmed" },
  { project: "milano", category: "subcontractor", supplier: "Elettrica Conti S.r.l.", description: "Impianto elettrico con quadro e prese", amountEur: 4850, costDate: "2024-11-04", source: "ai_extracted", status: "confirmed" },
  { project: "milano", category: "labour", supplier: "Edilizia Rossi S.r.l.", description: "Demolizioni e opere murarie", amountEur: 3100, costDate: "2024-10-15", source: "manual", status: "confirmed" },
  { project: "milano", category: "materials", supplier: "Sanitari Lombardi", description: "Sanitari sospesi e miscelatori", amountEur: 1875.5, costDate: "2024-11-12", source: "ai_extracted", status: "needs_review" },
  { project: "milano", category: "materials", supplier: "Marmi Brianza", description: "Piano cucina in quarzo", amountEur: 1260, costDate: "2024-12-03", source: "ai_extracted", status: "needs_review" },
  { project: "milano", category: "labour", supplier: "Edilizia Rossi S.r.l.", description: "Posa di pavimenti e rivestimenti", amountEur: 4400, costDate: "2024-11-25", source: "manual", status: "confirmed" },
  { project: "milano", category: "other", supplier: "Smaltimento Rifiuti Milano", description: "Container e smaltimento macerie", amountEur: 540, costDate: "2024-10-18", source: "manual", status: "confirmed" },
  { project: "milano", category: "materials", supplier: "Ferramenta Bruni", description: "Materiali vari di consumo", amountEur: 186.4, costDate: "2024-12-01", source: "manual", status: "confirmed" },
];
