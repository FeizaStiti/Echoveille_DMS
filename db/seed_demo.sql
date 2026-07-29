-- Données de démonstration EchoVeille — tous les échographes sont de marque Samsung

-- Équipe
insert into utilisateurs (nom_utilisateur, nom_complet, mot_de_passe_hash, role) values
  ('khoubeib', 'Khoubeib Maalej', '$2a$10$7DAFsjHOxALna6pO4WaMRea3d3XlHNv56AB0U4sHnuO7bHOw4oMzK', 'admin'),
  ('amenallah', 'Amen Allah', '$2a$10$7DAFsjHOxALna6pO4WaMRea3d3XlHNv56AB0U4sHnuO7bHOw4oMzK', 'technicien');

-- Établissements clients
insert into etablissements (id, nom, type, ville) values
  ('11111111-1111-1111-1111-111111111111', 'Hôpital Charles Nicolle', 'hopital', 'Tunis'),
  ('22222222-2222-2222-2222-222222222222', 'Clinique El Amen', 'clinique', 'Sfax'),
  ('33333333-3333-3333-3333-333333333333', 'Cabinet Dr. Bouazizi', 'cabinet', 'Sousse'),
  ('44444444-4444-4444-4444-444444444444', 'Polyclinique Les Berges du Lac', 'clinique', 'Tunis'),
  ('55555555-5555-5555-5555-555555555555', 'Hôpital Régional de Gabès', 'hopital', 'Gabès');

-- Échographes — uniquement des appareils Samsung
insert into echographes (id, marque, type_appareil, numero_serie, etablissement_id, date_installation, garantie_fin) values
  ('a1111111-1111-1111-1111-111111111111', 'Samsung', 'V8', 'SGV8-2023-0451', '11111111-1111-1111-1111-111111111111', '2023-03-14', '2026-03-14'),
  ('a2222222-2222-2222-2222-222222222222', 'Samsung', 'RS85', 'SGRS85-2022-1187', '22222222-2222-2222-2222-222222222222', '2022-09-01', '2025-09-01'),
  ('a3333333-3333-3333-3333-333333333333', 'Samsung', 'HS70A', 'SGHS70A-2024-0092', '33333333-3333-3333-3333-333333333333', '2024-01-20', '2027-01-20'),
  ('a4444444-4444-4444-4444-444444444444', 'Samsung', 'V8', 'SGV8-2023-0788', '44444444-4444-4444-4444-444444444444', '2023-11-05', '2026-11-05'),
  ('a5555555-5555-5555-5555-555555555555', 'Samsung', 'HERA W10', 'SGW10-2024-0210', '55555555-5555-5555-5555-555555555555', '2024-06-18', '2027-06-18'),
  ('a6666666-6666-6666-6666-666666666666', 'Samsung', 'RS85', 'SGRS85-2021-0654', '11111111-1111-1111-1111-111111111111', '2021-05-10', '2024-05-10');

-- Contrats de maintenance
insert into contrats (id, echographe_id, type_contrat, frequence_par_an, date_premiere_maintenance, statut) values
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'preventif', 4, '2025-02-01', 'actif'),
  ('c2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'tout_risque', 2, '2025-01-15', 'actif'),
  ('c3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'preventif', 3, '2025-03-01', 'actif'),
  ('c4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'preventif', 4, '2024-12-01', 'actif'),
  ('c5555555-5555-5555-5555-555555555555', 'a5555555-5555-5555-5555-555555555555', 'tout_risque', 3, '2025-04-10', 'actif'),
  ('c6666666-6666-6666-6666-666666666666', 'a6666666-6666-6666-6666-666666666666', 'preventif', 2, '2024-06-01', 'actif');

-- Planning de maintenance (mélange de visites faites, à venir, et en retard pour un dashboard réaliste)
insert into maintenances (contrat_id, numero_visite, date_prevue, date_effective, statut, technicien_id) values
  -- contrat 1 (Samsung V8 - Charles Nicolle) — 4x/an
  ('c1111111-1111-1111-1111-111111111111', 1, '2025-02-01', '2025-02-02', 'fait', (select id from utilisateurs where nom_utilisateur='khoubeib')),
  ('c1111111-1111-1111-1111-111111111111', 2, '2025-05-01', '2025-05-01', 'fait', (select id from utilisateurs where nom_utilisateur='amenallah')),
  ('c1111111-1111-1111-1111-111111111111', 3, current_date + interval '1 day', null, 'a_venir', null),
  ('c1111111-1111-1111-1111-111111111111', 4, '2025-11-01', null, 'a_venir', null),
  -- contrat 2 (Samsung RS85 - El Amen) — 2x/an
  ('c2222222-2222-2222-2222-222222222222', 1, '2025-01-15', '2025-01-16', 'fait', (select id from utilisateurs where nom_utilisateur='khoubeib')),
  ('c2222222-2222-2222-2222-222222222222', 2, current_date - interval '5 days', null, 'retard', null),
  -- contrat 3 (Samsung HS70A - Bouazizi) — 3x/an
  ('c3333333-3333-3333-3333-333333333333', 1, '2025-03-01', '2025-03-01', 'fait', (select id from utilisateurs where nom_utilisateur='amenallah')),
  ('c3333333-3333-3333-3333-333333333333', 2, current_date + interval '2 days', null, 'a_venir', null),
  ('c3333333-3333-3333-3333-333333333333', 3, '2025-11-01', null, 'a_venir', null),
  -- contrat 4 (Samsung V8 - Berges du Lac) — 4x/an
  ('c4444444-4444-4444-4444-444444444444', 1, '2024-12-01', '2024-12-01', 'fait', (select id from utilisateurs where nom_utilisateur='khoubeib')),
  ('c4444444-4444-4444-4444-444444444444', 2, '2025-03-01', '2025-03-03', 'fait', (select id from utilisateurs where nom_utilisateur='amenallah')),
  ('c4444444-4444-4444-4444-444444444444', 3, current_date - interval '10 days', null, 'retard', null),
  ('c4444444-4444-4444-4444-444444444444', 4, '2025-09-01', null, 'a_venir', null),
  -- contrat 5 (Samsung HERA W10 - Gabès) — 3x/an
  ('c5555555-5555-5555-5555-555555555555', 1, '2025-04-10', '2025-04-11', 'fait', (select id from utilisateurs where nom_utilisateur='amenallah')),
  ('c5555555-5555-5555-5555-555555555555', 2, current_date + interval '1 day', null, 'a_venir', null),
  ('c5555555-5555-5555-5555-555555555555', 3, '2025-12-10', null, 'a_venir', null),
  -- contrat 6 (Samsung RS85 - Charles Nicolle) — 2x/an
  ('c6666666-6666-6666-6666-666666666666', 1, '2024-06-01', '2024-06-02', 'fait', (select id from utilisateurs where nom_utilisateur='khoubeib')),
  ('c6666666-6666-6666-6666-666666666666', 2, '2024-12-01', '2024-12-01', 'fait', (select id from utilisateurs where nom_utilisateur='khoubeib'));

-- Interventions techniques
insert into interventions (echographe_id, technicien_id, type_intervention, description, date_intervention) values
  ('a1111111-1111-1111-1111-111111111111', (select id from utilisateurs where nom_utilisateur='khoubeib'), 'installation', 'Installation initiale et calibration de la sonde Doppler.', '2023-03-14'),
  ('a2222222-2222-2222-2222-222222222222', (select id from utilisateurs where nom_utilisateur='amenallah'), 'panne', 'Message "Over Temperature" affiché — ventilateur interne remplacé.', '2025-06-02'),
  ('a4444444-4444-4444-4444-444444444444', (select id from utilisateurs where nom_utilisateur='khoubeib'), 'depannage', 'Redémarrages intempestifs — renouvellement de la pâte thermique CPU/GPU.', '2025-07-10'),
  ('a3333333-3333-3333-3333-333333333333', (select id from utilisateurs where nom_utilisateur='amenallah'), 'autre', 'Mise à jour logicielle et contrôle qualité image.', '2025-05-20'),
  ('a6666666-6666-6666-6666-666666666666', (select id from utilisateurs where nom_utilisateur='khoubeib'), 'panne', 'Sonde anormalement chaude en mode Doppler continu — contrôle du refroidissement.', '2025-04-18');
