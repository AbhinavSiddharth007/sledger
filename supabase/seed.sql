-- Sample data for local development. `supabase db reset` runs this after the migrations.
-- Amounts are net EUR converted to cents; VAT is applied per project country.

insert into projects (id, name, client_name, budget_cents, status) values
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'Reforma integral piso Calle Alcalá 45', 'Inmobiliaria Torres S.L.', 18500000, 'active'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'Ampliación nave logística Getafe', 'Logística Mendoza S.A.', 42000000, 'active'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'Ristrutturazione bagno e cucina Via Brera 12', 'Studio Bianchi Architetti', 6850000, 'completed');

insert into costs (project_id, category, supplier, description, amount_cents, vat_cents, cost_date, source, status) values
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'materials', 'Materiales Hermanos Ruiz S.L.', 'Tabiquería pladur y perfiles', 128040, 26888, '2025-02-03', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'materials', 'Cerámicas Levante', 'Azulejo baño 30x60 (24 m²)', 186400, 39144, '2025-02-10', 'ai_extracted', 'needs_review'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'labour', 'Obras Gil', 'Demolición y retirada de escombros', 240000, 50400, '2025-02-05', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'subcontractor', 'Electricidad Benítez S.L.', 'Instalación eléctrica completa vivienda', 685000, 143850, '2025-03-01', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'subcontractor', 'Fontanería Moreno', 'Red de fontanería y saneamiento baño y cocina', 412050, 86531, '2025-03-04', 'ai_extracted', 'needs_review'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'materials', 'Pinturas Iberia', 'Pintura plástica e imprimación (6 estancias)', 48690, 10225, '2025-04-12', 'ai_extracted', 'needs_review'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'materials', 'Ferretería Gómez', 'Tornillería, silicona y fijaciones', 21235, 4459, '2025-03-18', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'other', 'Contenedores Madrid Sur', 'Contenedor 6 m³ para escombros', 39000, 8190, '2025-02-06', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'labour', 'Obras Gil', 'Mano de obra alicatado y solado (3 semanas)', 520000, 109200, '2025-03-25', 'manual', 'confirmed'),
  ('4cbe336e-0074-45c2-a4ec-211d421e0fd5', 'materials', 'Carpintería Lozano', 'Puertas interiores lacadas (4 uds)', 215000, 45150, '2025-05-02', 'ai_extracted', 'needs_review'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'materials', 'Hormigones Sur S.A.', 'Hormigón HA-25 para solera (62 m³)', 961000, 201810, '2025-06-12', 'ai_extracted', 'needs_review'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'materials', 'Aceros Castilla', 'Mallazo y armaduras B500S', 1475025, 309755, '2025-06-08', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'subcontractor', 'Estructuras Metálicas Ibérica', 'Montaje de estructura metálica de la nave', 5840000, 1226400, '2025-07-22', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'labour', 'Construcciones Ortega', 'Mano de obra de encofrado y hormigonado', 1890000, 396900, '2025-06-15', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'subcontractor', 'Cubiertas Levante S.L.', 'Cubierta de panel sándwich (1.200 m²)', 3620000, 760200, '2025-08-30', 'ai_extracted', 'needs_review'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'materials', 'Puertas Industriales Castilla', 'Puertas seccionales industriales (3 uds)', 1140000, 239400, '2025-09-10', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'other', 'Gestión de Residuos Getafe', 'Retirada de tierras y sobrantes', 175000, 36750, '2025-06-02', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'subcontractor', 'Electricidad Benítez S.L.', 'Cuadro eléctrico y alumbrado industrial', 2230000, 468300, '2025-09-25', 'ai_extracted', 'needs_review'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'materials', 'Pinturas Iberia', 'Pavimento epoxi zona de almacén (900 m²)', 864000, 181440, '2025-10-05', 'manual', 'confirmed'),
  ('db125d7a-0539-43f1-9587-32d75140cc7e', 'labour', 'Construcciones Ortega', 'Mano de obra de cerramientos', 745000, 156450, '2025-08-18', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'materials', 'Ceramiche Emilia S.p.A.', 'Gres porcellanato bagno e cucina (38 m²)', 234000, 51480, '2024-10-10', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'materials', 'Colorificio Verdi S.r.l.', 'Pittura lavabile e stucco', 41280, 9082, '2024-11-20', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'subcontractor', 'Idraulica Ferrari S.n.c.', 'Rifacimento impianto idrico e scarichi', 620000, 136400, '2024-10-28', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'subcontractor', 'Elettrica Conti S.r.l.', 'Impianto elettrico con quadro e prese', 485000, 106700, '2024-11-04', 'ai_extracted', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'labour', 'Edilizia Rossi S.r.l.', 'Demolizioni e opere murarie', 310000, 68200, '2024-10-15', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'materials', 'Sanitari Lombardi', 'Sanitari sospesi e miscelatori', 187550, 41261, '2024-11-12', 'ai_extracted', 'needs_review'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'materials', 'Marmi Brianza', 'Piano cucina in quarzo', 126000, 27720, '2024-12-03', 'ai_extracted', 'needs_review'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'labour', 'Edilizia Rossi S.r.l.', 'Posa di pavimenti e rivestimenti', 440000, 96800, '2024-11-25', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'other', 'Smaltimento Rifiuti Milano', 'Container e smaltimento macerie', 54000, 11880, '2024-10-18', 'manual', 'confirmed'),
  ('3c2f4d4f-5676-4c30-bc43-882a2d89999d', 'materials', 'Ferramenta Bruni', 'Materiali vari di consumo', 18640, 4101, '2024-12-01', 'manual', 'confirmed');

