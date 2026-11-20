-- ════════════════════════════════════════════════════════════════════════════
-- ComboYa · Datos de demostración
--
-- seed_demo()  → borra catálogo y pedidos y siembra datos realistas:
--                6 categorías, 40 productos, 8 combos, 15 zonas (La Habana),
--                histórico de tasas USD→CUP/EUR, 3 banners y 30 pedidos.
-- reset_demo() → igual que seed_demo() pero con límite de 1 vez por minuto.
--
-- Las fechas son relativas a now() para que el dashboard siempre tenga
-- actividad reciente. random() se inicializa con setseed() para que la demo
-- sea reproducible.
--
-- Solo invocables con service role (servidor). Nunca desde el navegador.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.configuracion add column ultimo_reset_demo timestamptz;

create or replace function public.seed_demo()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_carnicos uuid; c_aseo uuid; c_bebidas uuid; c_granos uuid; c_dulces uuid; c_combos uuid;

  v_compradores text[] := array[
    'Yanelis Rodríguez Pérez', 'Alejandro Fernández Díaz', 'Maylín González Hernández',
    'Raúl Martínez Suárez', 'Dayana López Castillo', 'Yoandry García Ramos',
    'Liset Hernández Morales', 'Osmany Pérez Cabrera', 'Arianna Díaz Valdés',
    'Reinier Sánchez Rivero', 'Yudith Torres Ortega', 'Michel Álvarez Fuentes',
    'Lisandra Ramírez Molina', 'Yasmany Castro Herrera', 'Daylén Rojas Domínguez'];
  v_paises text[] := array[
    'Estados Unidos', 'Estados Unidos', 'Estados Unidos', 'España', 'España',
    'México', 'Canadá', 'Italia', 'Uruguay', 'Chile'];
  v_prefijos text[] := array['1305', '1786', '1813', '34', '34', '52', '1416', '39', '598', '56'];
  v_destinatarios text[] := array[
    'Caridad Pérez Linares', 'Orlando Rodríguez Vega', 'Marta Hernández Soto',
    'Rafael González Barrios', 'Juana María Díaz Ruiz', 'Ernesto Martínez Pupo',
    'Nilda Fernández Acosta', 'Pedro Luis García Cruz', 'Gladys Suárez Medina',
    'Jorge Luis Castillo Mesa', 'Teresa Morales Leyva', 'Ramón López Echevarría',
    'Mercedes Ramos Bello', 'Armando Cabrera Quintana', 'Esther Valdés Agüero'];
  v_calles text[] := array[
    'Calle 23 #1054 e/ 12 y 14', 'Ave. 31 #4610 e/ 46 y 48', 'Neptuno #512 e/ Escobar y Gervasio',
    'Obispo #358 e/ Habana y Compostela', 'Calle G #305 apto 4 e/ 13 y 15',
    'Ave. 26 #1102 e/ Rancho Boyeros y Ayestarán', 'Santa Catalina #1268 e/ Vista Alegre y Mayía',
    'Calle 100 #3906 e/ 39 y 41', 'Infanta #1158 e/ Concordia y Neptuno',
    'Lealtad #417 e/ San Miguel y San Rafael', 'Calle 5ta B #8214 e/ 82 y 84',
    'Calzada del Cerro #1823 e/ Tulipán y Ayestarán', 'Calle L #456 e/ 25 y 27',
    'Mercaderes #202 e/ Empedrado y O''Reilly', 'Ave. 51 #12406 e/ 124 y 126'];
  v_referencias text[] := array[
    'Casa de rejas verdes, al lado de la bodega', 'Edificio de 4 plantas, tocar en el apto 4',
    'Frente al parque', 'Al doblar de la farmacia', 'Casa amarilla con portal',
    'Preguntar por la señora del primer piso', null, null];
  v_mensajes text[] := array[
    '¡Feliz cumpleaños, mami! Te quiero mucho.', 'Para que pasen un buen fin de semana. Besos.',
    'Abuela, cuídese mucho. La extrañamos.', 'Con cariño desde Miami.',
    'Para la fiesta de la niña. ¡Disfruten!', null, null, null];

  v_combos_ids uuid[];
  v_productos_ids uuid[];
  v_zona public.zonas_entrega%rowtype;
  v_pedido_id uuid;
  v_dias_atras numeric;
  v_fecha timestamptz;
  v_estado public.estado_pedido;
  v_pago public.estado_pago;
  v_metodo public.metodo_pago;
  v_subtotal numeric(10, 2);
  v_idx int;
  v_tel_dest text;
begin
  perform setseed(0.42);

  -- ─── Limpieza ─────────────────────────────────────────────────────────────
  delete from public.pedidos where true;          -- cascada a items y eventos
  delete from public.combo_items where true;
  delete from public.productos where true;
  delete from public.categorias where true;
  delete from public.zonas_entrega where true;
  delete from public.tasas_cambio where true;
  delete from public.banners where true;

  -- ─── Configuración ────────────────────────────────────────────────────────
  insert into public.configuracion (id, nombre_negocio, whatsapp_negocio, email_contacto, horario)
  values (true, 'ComboYa', '5355555555', 'pedidos@comboya.cu', 'Lunes a sábado, 8:00 a. m. – 6:00 p. m.')
  on conflict (id) do update
    set nombre_negocio = excluded.nombre_negocio,
        whatsapp_negocio = excluded.whatsapp_negocio,
        email_contacto = excluded.email_contacto,
        horario = excluded.horario;

  -- ─── Categorías ───────────────────────────────────────────────────────────
  insert into public.categorias (nombre, slug, icono, orden) values ('Combos', 'combos', 'gift', 1) returning id into c_combos;
  insert into public.categorias (nombre, slug, icono, orden) values ('Cárnicos', 'carnicos', 'drumstick', 2) returning id into c_carnicos;
  insert into public.categorias (nombre, slug, icono, orden) values ('Granos y despensa', 'granos', 'wheat', 3) returning id into c_granos;
  insert into public.categorias (nombre, slug, icono, orden) values ('Aseo', 'aseo', 'spray', 4) returning id into c_aseo;
  insert into public.categorias (nombre, slug, icono, orden) values ('Bebidas', 'bebidas', 'cup', 5) returning id into c_bebidas;
  insert into public.categorias (nombre, slug, icono, orden) values ('Dulces', 'dulces', 'candy', 6) returning id into c_dulces;

  -- ─── Productos (40) ───────────────────────────────────────────────────────
  insert into public.productos (categoria_id, nombre, slug, unidad, precio_usd, stock, destacado, descripcion, imagen_url) values
  -- Cárnicos
  (c_carnicos, 'Pollo troceado', 'pollo-troceado-10lb', 'caja 10 lb', 22.00, 40, true, 'Pollo congelado troceado, listo para cocinar. Ideal para la semana de toda la familia.', 'productos/pollo-troceado-10lb.webp'),
  (c_carnicos, 'Muslos de pollo', 'muslos-pollo-5lb', 'bolsa 5 lb', 11.50, 35, false, 'Muslos y contramuslos de pollo congelados.', 'productos/muslos-pollo-5lb.webp'),
  (c_carnicos, 'Picadillo de pollo', 'picadillo-pollo-1kg', 'paquete 1 kg', 3.90, 60, false, 'Picadillo de pollo congelado, perfecto para croquetas y arroz con picadillo.', 'productos/picadillo-pollo-1kg.webp'),
  (c_carnicos, 'Salchichas de pollo', 'salchichas-pollo-1kg', 'paquete 1 kg', 6.50, 50, false, 'Salchichas tipo Viena, unas 20 unidades por paquete.', 'productos/salchichas-pollo-1kg.webp'),
  (c_carnicos, 'Jamón de pierna', 'jamon-pierna-1kg', 'pieza 1 kg', 12.00, 20, false, 'Jamón cocido de pierna de cerdo, para bocaditos y desayunos.', 'productos/jamon-pierna-1kg.webp'),
  (c_carnicos, 'Masas de cerdo', 'masas-cerdo-2kg', 'bolsa 2 kg', 16.00, 25, true, 'Masas de cerdo sin hueso para freír o asar. El plato de los domingos.', 'productos/masas-cerdo-2kg.webp'),
  (c_carnicos, 'Chorizo', 'chorizo-500g', 'paquete 500 g', 5.20, 30, false, 'Chorizo ahumado para potajes y arroces.', 'productos/chorizo-500g.webp'),
  (c_carnicos, 'Lomo ahumado', 'lomo-ahumado-1kg', 'pieza 1 kg', 13.50, 15, false, 'Lomo de cerdo ahumado, listo para lascar.', 'productos/lomo-ahumado-1kg.webp'),
  -- Granos y despensa
  (c_granos, 'Arroz', 'arroz-10lb', 'saco 10 lb', 9.00, 80, true, 'Arroz blanco de grano largo, 4 % partido.', 'productos/arroz-10lb.webp'),
  (c_granos, 'Frijoles negros', 'frijoles-negros-1kg', 'paquete 1 kg', 3.80, 70, false, 'Frijoles negros seleccionados para el congrí y el potaje.', 'productos/frijoles-negros-1kg.webp'),
  (c_granos, 'Frijoles colorados', 'frijoles-colorados-1kg', 'paquete 1 kg', 4.00, 50, false, 'Frijoles colorados para potaje.', 'productos/frijoles-colorados-1kg.webp'),
  (c_granos, 'Chícharos', 'chicharos-1kg', 'paquete 1 kg', 3.00, 50, false, 'Chícharos secos partidos.', 'productos/chicharos-1kg.webp'),
  (c_granos, 'Azúcar blanca', 'azucar-2kg', 'paquete 2 kg', 3.90, 70, false, 'Azúcar refino blanca.', 'productos/azucar-2kg.webp'),
  (c_granos, 'Aceite de girasol', 'aceite-girasol-1l', 'botella 1 L', 3.75, 90, true, 'Aceite vegetal de girasol.', 'productos/aceite-girasol-1l.webp'),
  (c_granos, 'Espaguetis', 'espaguetis-500g', 'paquete 500 g', 1.50, 100, false, 'Pasta larga de sémola de trigo.', 'productos/espaguetis-500g.webp'),
  (c_granos, 'Leche en polvo', 'leche-polvo-1kg', 'bolsa 1 kg', 12.00, 40, true, 'Leche entera en polvo. Rinde 8 litros.', 'productos/leche-polvo-1kg.webp'),
  -- Aseo
  (c_aseo, 'Detergente en polvo', 'detergente-polvo-1kg', 'bolsa 1 kg', 3.50, 80, false, 'Detergente para ropa a mano y lavadora.', 'productos/detergente-polvo-1kg.webp'),
  (c_aseo, 'Jabón de baño', 'jabon-bano-3u', 'paquete 3 u', 2.80, 100, false, 'Jabón de tocador con glicerina.', 'productos/jabon-bano-3u.webp'),
  (c_aseo, 'Champú', 'champu-400ml', 'frasco 400 ml', 4.25, 45, false, 'Champú para todo tipo de cabello.', 'productos/champu-400ml.webp'),
  (c_aseo, 'Pasta dental', 'pasta-dental-3u', 'paquete 3 u', 3.60, 60, false, 'Crema dental con flúor, 75 ml cada una.', 'productos/pasta-dental-3u.webp'),
  (c_aseo, 'Papel higiénico', 'papel-higienico-4u', 'paquete 4 rollos', 3.00, 90, false, 'Papel higiénico doble hoja.', 'productos/papel-higienico-4u.webp'),
  (c_aseo, 'Desodorante roll-on', 'desodorante-roll-on', 'frasco 50 ml', 3.90, 40, false, 'Desodorante antitranspirante 48 h.', 'productos/desodorante-roll-on.webp'),
  (c_aseo, 'Cloro', 'cloro-1l', 'botella 1 L', 1.80, 70, false, 'Hipoclorito para limpieza y desinfección.', 'productos/cloro-1l.webp'),
  (c_aseo, 'Lavaplatos líquido', 'lavaplatos-750ml', 'frasco 750 ml', 2.75, 60, false, 'Lavavajillas concentrado con aroma a limón.', 'productos/lavaplatos-750ml.webp'),
  -- Bebidas
  (c_bebidas, 'Cerveza Cristal', 'cerveza-cristal-24', 'caja 24 latas', 24.00, 30, true, 'Cerveza clara cubana, 355 ml por lata.', 'productos/cerveza-cristal-24.webp'),
  (c_bebidas, 'Cerveza Bucanero', 'cerveza-bucanero-24', 'caja 24 latas', 26.00, 25, false, 'Cerveza fuerte cubana, 355 ml por lata.', 'productos/cerveza-bucanero-24.webp'),
  (c_bebidas, 'Malta', 'malta-24', 'caja 24 latas', 22.00, 20, false, 'Bebida de malta, la preferida de los niños.', 'productos/malta-24.webp'),
  (c_bebidas, 'Refresco de cola', 'refresco-cola-1-5l', 'botella 1.5 L', 1.90, 120, false, 'Refresco gaseado sabor cola.', 'productos/refresco-cola-1-5l.webp'),
  (c_bebidas, 'Ron Havana Club Añejo 3 Años', 'ron-havana-club-3', 'botella 700 ml', 9.50, 40, false, 'Ron blanco añejado, ideal para mojitos.', 'productos/ron-havana-club-3.webp'),
  (c_bebidas, 'Agua mineral', 'agua-mineral-6u', 'paquete 6 × 1.5 L', 4.80, 50, false, 'Agua mineral natural sin gas.', 'productos/agua-mineral-6u.webp'),
  (c_bebidas, 'Néctar de mango', 'nectar-mango-1l', 'caja 1 L', 2.40, 60, false, 'Néctar de mango con pulpa.', 'productos/nectar-mango-1l.webp'),
  (c_bebidas, 'Café molido Serrano', 'cafe-serrano-250g', 'paquete 250 g', 4.90, 70, true, 'Café cubano de montaña, tueste oscuro.', 'productos/cafe-serrano-250g.webp'),
  -- Dulces
  (c_dulces, 'Galletas María', 'galletas-maria', 'paquete 200 g', 1.60, 80, false, 'Galletas dulces clásicas para la merienda.', 'productos/galletas-maria.webp'),
  (c_dulces, 'Barra de guayaba', 'barra-guayaba-600g', 'barra 600 g', 3.20, 40, false, 'Dulce de guayaba en barra. Con queso, ¡no hay quien le gane!', 'productos/barra-guayaba-600g.webp'),
  (c_dulces, 'Chocolate en polvo', 'chocolate-polvo-400g', 'lata 400 g', 4.50, 40, false, 'Cacao instantáneo para la leche.', 'productos/chocolate-polvo-400g.webp'),
  (c_dulces, 'Turrón de maní', 'turron-mani-6u', 'paquete 6 u', 2.50, 50, false, 'Turrón artesanal de maní y miel.', 'productos/turron-mani-6u.webp'),
  (c_dulces, 'Galletas de soda', 'galletas-soda', 'paquete 300 g', 2.30, 60, false, 'Galletas saladas, perfectas con mantequilla.', 'productos/galletas-soda.webp'),
  (c_dulces, 'Caramelos surtidos', 'caramelos-surtidos', 'bolsa 500 g', 2.00, 50, false, 'Caramelos de frutas variadas.', 'productos/caramelos-surtidos.webp'),
  (c_dulces, 'Dulce de leche', 'dulce-leche-450g', 'pomo 450 g', 3.40, 35, false, 'Dulce de leche cremoso.', 'productos/dulce-leche-450g.webp'),
  (c_dulces, 'Flan en polvo', 'flan-polvo-4u', 'caja 4 sobres', 2.20, 45, false, 'Flan instantáneo sabor vainilla con caramelo.', 'productos/flan-polvo-4u.webp');

  -- ─── Combos (8) ───────────────────────────────────────────────────────────
  insert into public.productos (categoria_id, tipo, nombre, slug, unidad, precio_usd, stock, destacado, descripcion, imagen_url) values
  (c_combos, 'combo', 'Combo Familiar Básico', 'combo-familiar-basico', '9 productos', 49.00, null, true, 'Lo esencial para la semana: arroz, frijoles, aceite, azúcar, pollo y espaguetis.', 'combos/combo-familiar-basico.webp'),
  (c_combos, 'combo', 'Combo Cárnico', 'combo-carnico', '6 productos', 59.00, null, true, 'Pollo, masas de cerdo, salchichas, picadillo y jamón. Proteína para todo el mes.', 'combos/combo-carnico.webp'),
  (c_combos, 'combo', 'Combo Aseo Completo', 'combo-aseo-completo', '10 productos', 29.00, null, true, 'Todo para la limpieza de la casa y el aseo personal.', 'combos/combo-aseo-completo.webp'),
  (c_combos, 'combo', 'Combo Cumpleaños', 'combo-cumpleanos', '9 productos', 45.00, null, true, 'Cerveza, refrescos, ron, caramelos y dulce de leche para celebrar en familia.', 'combos/combo-cumpleanos.webp'),
  (c_combos, 'combo', 'Combo Desayuno', 'combo-desayuno', '8 productos', 32.00, null, false, 'Café, leche en polvo, azúcar, galletas y chocolate para empezar el día.', 'combos/combo-desayuno.webp'),
  (c_combos, 'combo', 'Combo Abuelos', 'combo-abuelos', '12 productos', 47.00, null, true, 'Pensado para nuestros mayores: leche, café, galletas, néctar y artículos de aseo.', 'combos/combo-abuelos.webp'),
  (c_combos, 'combo', 'Combo Fin de Semana', 'combo-fin-de-semana', '5 productos', 54.00, null, false, 'Masas de cerdo, cerveza Bucanero, arroz y frijoles para el almuerzo del domingo.', 'combos/combo-fin-de-semana.webp'),
  (c_combos, 'combo', 'Combo Mega Mensual', 'combo-mega-mensual', '23 productos', 115.00, null, true, 'La compra del mes completa: despensa, cárnicos y aseo. El más pedido.', 'combos/combo-mega-mensual.webp');

  insert into public.combo_items (combo_id, producto_id, cantidad)
  select c.id, p.id, x.cantidad
  from (values
    ('combo-familiar-basico', 'arroz-10lb', 1), ('combo-familiar-basico', 'frijoles-negros-1kg', 2),
    ('combo-familiar-basico', 'aceite-girasol-1l', 2), ('combo-familiar-basico', 'azucar-2kg', 1),
    ('combo-familiar-basico', 'pollo-troceado-10lb', 1), ('combo-familiar-basico', 'espaguetis-500g', 2),

    ('combo-carnico', 'pollo-troceado-10lb', 1), ('combo-carnico', 'masas-cerdo-2kg', 1),
    ('combo-carnico', 'salchichas-pollo-1kg', 1), ('combo-carnico', 'picadillo-pollo-1kg', 2),
    ('combo-carnico', 'jamon-pierna-1kg', 1),

    ('combo-aseo-completo', 'detergente-polvo-1kg', 2), ('combo-aseo-completo', 'jabon-bano-3u', 1),
    ('combo-aseo-completo', 'champu-400ml', 1), ('combo-aseo-completo', 'pasta-dental-3u', 1),
    ('combo-aseo-completo', 'papel-higienico-4u', 2), ('combo-aseo-completo', 'desodorante-roll-on', 1),
    ('combo-aseo-completo', 'lavaplatos-750ml', 1), ('combo-aseo-completo', 'cloro-1l', 1),

    ('combo-cumpleanos', 'cerveza-cristal-24', 1), ('combo-cumpleanos', 'refresco-cola-1-5l', 4),
    ('combo-cumpleanos', 'caramelos-surtidos', 2), ('combo-cumpleanos', 'ron-havana-club-3', 1),
    ('combo-cumpleanos', 'dulce-leche-450g', 1),

    ('combo-desayuno', 'cafe-serrano-250g', 2), ('combo-desayuno', 'leche-polvo-1kg', 1),
    ('combo-desayuno', 'azucar-2kg', 1), ('combo-desayuno', 'galletas-maria', 3),
    ('combo-desayuno', 'chocolate-polvo-400g', 1),

    ('combo-abuelos', 'leche-polvo-1kg', 2), ('combo-abuelos', 'cafe-serrano-250g', 1),
    ('combo-abuelos', 'galletas-soda', 2), ('combo-abuelos', 'jabon-bano-3u', 1),
    ('combo-abuelos', 'papel-higienico-4u', 2), ('combo-abuelos', 'nectar-mango-1l', 4),

    ('combo-fin-de-semana', 'masas-cerdo-2kg', 1), ('combo-fin-de-semana', 'cerveza-bucanero-24', 1),
    ('combo-fin-de-semana', 'arroz-10lb', 1), ('combo-fin-de-semana', 'frijoles-negros-1kg', 1),
    ('combo-fin-de-semana', 'aceite-girasol-1l', 1),

    ('combo-mega-mensual', 'arroz-10lb', 2), ('combo-mega-mensual', 'frijoles-negros-1kg', 2),
    ('combo-mega-mensual', 'frijoles-colorados-1kg', 1), ('combo-mega-mensual', 'aceite-girasol-1l', 3),
    ('combo-mega-mensual', 'azucar-2kg', 2), ('combo-mega-mensual', 'pollo-troceado-10lb', 2),
    ('combo-mega-mensual', 'salchichas-pollo-1kg', 1), ('combo-mega-mensual', 'detergente-polvo-1kg', 2),
    ('combo-mega-mensual', 'jabon-bano-3u', 1), ('combo-mega-mensual', 'papel-higienico-4u', 2),
    ('combo-mega-mensual', 'cafe-serrano-250g', 1), ('combo-mega-mensual', 'espaguetis-500g', 4)
  ) as x(combo_slug, producto_slug, cantidad)
  join public.productos c on c.slug = x.combo_slug
  join public.productos p on p.slug = x.producto_slug;

  -- ─── Zonas de entrega: los 15 municipios de La Habana ─────────────────────
  insert into public.zonas_entrega (municipio, costo_usd, dias_min, dias_max) values
  ('Plaza de la Revolución (Vedado)', 3.00, 1, 2),
  ('Playa',                          3.00, 1, 2),
  ('Centro Habana',                  3.00, 1, 2),
  ('La Habana Vieja',                3.00, 1, 2),
  ('Cerro',                          4.00, 1, 3),
  ('Diez de Octubre',                4.00, 1, 3),
  ('Marianao',                       4.00, 2, 3),
  ('La Lisa',                        5.00, 2, 3),
  ('Regla',                          5.00, 2, 3),
  ('Arroyo Naranjo',                 5.00, 2, 4),
  ('San Miguel del Padrón',          5.00, 2, 4),
  ('Boyeros',                        6.00, 2, 4),
  ('Guanabacoa',                     6.00, 2, 4),
  ('Habana del Este',                6.00, 2, 4),
  ('Cotorro',                        7.00, 3, 5);

  -- ─── Tasas de cambio (histórico de 30 días) ────────────────────────────────
  insert into public.tasas_cambio (moneda, tasa, vigente_desde)
  select 'CUP', t.tasa, now() - make_interval(days => t.dias)
  from (values (30, 385.0), (24, 390.0), (18, 395.0), (12, 400.0), (6, 405.0), (1, 410.0)) as t(dias, tasa);

  insert into public.tasas_cambio (moneda, tasa, vigente_desde)
  select 'EUR', t.tasa, now() - make_interval(days => t.dias)
  from (values (30, 0.9300), (15, 0.9250), (1, 0.9200)) as t(dias, tasa);

  -- ─── Banners ──────────────────────────────────────────────────────────────
  insert into public.banners (titulo, subtitulo, imagen_url, enlace, orden) values
  ('Su familia, bien atendida', 'Combos entregados en La Habana en 24–72 horas', 'banners/banner-familia.webp', '/productos?categoria=combos', 1),
  ('Combo Mega Mensual', 'La compra del mes completa por solo $115', 'banners/banner-mega.webp', '/p/combo-mega-mensual', 2),
  ('¿Cumpleaños en casa?', 'Cerveza, ron y dulces para celebrar a lo grande', 'banners/banner-cumpleanos.webp', '/p/combo-cumpleanos', 3);

  -- ─── Pedidos (30) ─────────────────────────────────────────────────────────
  select array_agg(id order by slug) into v_combos_ids from public.productos where tipo = 'combo';
  select array_agg(id order by slug) into v_productos_ids from public.productos where tipo = 'producto';

  for i in 1..30 loop
    -- Más pedidos en los días recientes; el más antiguo, hace ~29 días.
    v_dias_atras := round((power(random(), 1.3) * 29)::numeric, 3);
    -- Los 4 primeros son de hoy, para que el panel siempre tenga pedidos por atender.
    if i <= 4 then
      v_dias_atras := round((random() * 0.3)::numeric, 3);
    end if;
    v_fecha := date_trunc('minute', now() - make_interval(secs => (v_dias_atras * 86400)::double precision))
               - make_interval(mins => (case when i <= 4 then random() * 90 else random() * 600 end)::int);

    -- Zonas céntricas con más peso.
    select * into v_zona from public.zonas_entrega
    order by case when costo_usd <= 4 then random() * 0.6 else random() end
    limit 1;

    -- Estado coherente con la antigüedad.
    v_estado := case
      when v_dias_atras > 5 then (case when random() < 0.08 then 'cancelado' else 'entregado' end)::public.estado_pedido
      when v_dias_atras > 3 then (array['en_camino', 'entregado', 'entregado'])[1 + floor(random() * 3)::int]::public.estado_pedido
      when v_dias_atras > 1 then (array['confirmado', 'en_preparacion', 'en_camino'])[1 + floor(random() * 3)::int]::public.estado_pedido
      else (array['pendiente', 'pendiente', 'confirmado'])[1 + floor(random() * 3)::int]::public.estado_pedido
    end;
    v_metodo := case when random() < 0.65 then 'enlace_pago' else 'efectivo_entrega' end;
    v_pago := case
      when v_estado = 'cancelado' then 'pendiente'
      when v_estado = 'entregado' then 'pagado'
      when v_estado = 'pendiente' then 'pendiente'
      when v_metodo = 'enlace_pago' then 'pagado'
      else 'pendiente'
    end;

    v_idx := 1 + floor(random() * array_length(v_compradores, 1))::int;
    v_tel_dest := '5' || (array['2', '3', '5', '6'])[1 + floor(random() * 4)::int]
                  || lpad(floor(random() * 1000000)::text, 6, '0');

    insert into public.pedidos (
      codigo, estado, estado_pago, metodo_pago,
      comprador_nombre, comprador_pais, comprador_telefono, comprador_email,
      dest_nombre, dest_carne, dest_telefono, zona_id, dest_municipio,
      dest_direccion, dest_referencia, mensaje_familia,
      subtotal_usd, envio_usd, total_usd, tasa_cup, tasa_eur,
      pagado_at, created_at, updated_at
    )
    select
      public.generar_codigo_pedido(), v_estado, v_pago, v_metodo,
      v_compradores[v_idx],
      v_paises[1 + (v_idx % array_length(v_paises, 1))],
      v_prefijos[1 + (v_idx % array_length(v_prefijos, 1))] || lpad(floor(random() * 10000000)::text, 7, '0'),
      lower(translate(split_part(v_compradores[v_idx], ' ', 1), 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'))
        || '.' || lower(translate(split_part(v_compradores[v_idx], ' ', 2), 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'))
        || '@ejemplo.com',
      v_destinatarios[1 + floor(random() * array_length(v_destinatarios, 1))::int],
      case when random() < 0.5 then
        lpad((40 + floor(random() * 50))::int::text, 2, '0')
        || lpad((1 + floor(random() * 12))::int::text, 2, '0')
        || lpad((1 + floor(random() * 28))::int::text, 2, '0')
        || lpad(floor(random() * 100000)::text, 5, '0')
      end,
      v_tel_dest, v_zona.id, v_zona.municipio,
      v_calles[1 + floor(random() * array_length(v_calles, 1))::int],
      v_referencias[1 + floor(random() * array_length(v_referencias, 1))::int],
      v_mensajes[1 + floor(random() * array_length(v_mensajes, 1))::int],
      0, v_zona.costo_usd, v_zona.costo_usd,
      (select tasa from public.tasas_vigentes where moneda = 'CUP'),
      (select tasa from public.tasas_vigentes where moneda = 'EUR'),
      case when v_pago = 'pagado' then v_fecha + interval '3 hours' end,
      v_fecha, v_fecha
    returning id into v_pedido_id;

    -- 1 combo (75 % de las veces) + 0–3 productos sueltos.
    if random() < 0.75 then
      insert into public.pedido_items (pedido_id, producto_id, nombre, tipo, precio_unit_usd, cantidad)
      select v_pedido_id, p.id, p.nombre, p.tipo, p.precio_usd, case when random() < 0.85 then 1 else 2 end
      from public.productos p
      where p.id = v_combos_ids[1 + floor(random() * array_length(v_combos_ids, 1))::int];
    end if;

    insert into public.pedido_items (pedido_id, producto_id, nombre, tipo, precio_unit_usd, cantidad)
    select v_pedido_id, p.id, p.nombre, p.tipo, p.precio_usd, 1 + floor(random() * 3)::int
    from public.productos p
    where p.tipo = 'producto'
    order by random()
    limit (case
      when not exists (select 1 from public.pedido_items where pedido_id = v_pedido_id) then 2 + floor(random() * 3)::int
      else floor(random() * 4)::int
    end);

    select sum(precio_unit_usd * cantidad) into v_subtotal
    from public.pedido_items where pedido_id = v_pedido_id;

    -- Las columnas de importes no disparan eventos; el trigger de update
    -- solo registra cambios de estado/pago, que aquí no cambian.
    update public.pedidos
    set subtotal_usd = v_subtotal,
        total_usd = v_subtotal + envio_usd,
        updated_at = v_fecha
    where id = v_pedido_id;

    -- Línea de tiempo coherente con el estado final.
    insert into public.pedido_eventos (pedido_id, estado, nota, created_at)
    select v_pedido_id, e.estado::public.estado_pedido, e.nota, v_fecha + e.desfase
    from (values
      (1, 'confirmado',     'Pedido confirmado',          interval '2 hours'),
      (2, 'en_preparacion', 'Preparando su pedido',       interval '20 hours'),
      (3, 'en_camino',      'En camino al destinatario',  interval '30 hours'),
      (4, 'entregado',      'Entregado a la familia',     interval '40 hours')
    ) as e(paso, estado, nota, desfase)
    where v_estado <> 'cancelado'
      and e.paso <= array_position(
            array['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado']::public.estado_pedido[],
            v_estado) - 1;

    if v_estado = 'cancelado' then
      insert into public.pedido_eventos (pedido_id, estado, nota, created_at)
      values (v_pedido_id, 'cancelado', 'Pedido cancelado a solicitud del cliente', v_fecha + interval '5 hours');
    end if;

    if v_pago = 'pagado' then
      insert into public.pedido_eventos (pedido_id, estado, nota, created_at)
      values (v_pedido_id, null, 'Pago confirmado', v_fecha + interval '3 hours');
    end if;
  end loop;
end;
$$;

create or replace function public.reset_demo()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ultimo timestamptz;
begin
  select ultimo_reset_demo into v_ultimo from public.configuracion where id for update;
  if v_ultimo is not null and v_ultimo > now() - interval '1 minute' then
    raise exception 'DEMASIADOS_RESETS: la demo se restableció hace menos de un minuto';
  end if;

  perform public.seed_demo();

  update public.configuracion set ultimo_reset_demo = now() where id;
end;
$$;

revoke all on function public.seed_demo() from public, anon, authenticated;
revoke all on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.seed_demo() to service_role;
grant execute on function public.reset_demo() to service_role;
