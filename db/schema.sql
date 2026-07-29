-- EchoVeille — schéma de base de données (Postgres / Supabase)
-- À exécuter une fois dans l'éditeur SQL de votre projet Supabase.

create extension if not exists pgcrypto;

create table if not exists etablissements (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null unique,
  type          text not null check (type in ('hopital','clinique','cabinet','autre')),
  ville         text,
  created_at    timestamptz not null default now()
);

create table if not exists echographes (
  id                  uuid primary key default gen_random_uuid(),
  marque              text not null,
  type_appareil       text not null,
  numero_serie        text not null unique,
  etablissement_id    uuid not null references etablissements(id) on delete restrict,
  date_installation   date not null,
  garantie_fin        date,
  fiche_travail_key   text,
  fiche_travail_nom   text,
  bon_livraison_key   text,
  bon_livraison_nom   text,
  created_at          timestamptz not null default now()
);

create table if not exists contrats (
  id                        uuid primary key default gen_random_uuid(),
  echographe_id             uuid not null references echographes(id) on delete cascade,
  type_contrat              text not null check (type_contrat in ('preventif','tout_risque')),
  frequence_par_an          integer not null check (frequence_par_an in (2,3,4)),
  date_premiere_maintenance date not null,
  statut                    text not null default 'actif' check (statut in ('actif','expire','renouvele')),
  created_at                timestamptz not null default now()
);

create table if not exists utilisateurs (
  id                  uuid primary key default gen_random_uuid(),
  nom_utilisateur     text not null unique,
  nom_complet         text not null,
  mot_de_passe_hash   text not null,
  role                text not null default 'technicien' check (role in ('admin','technicien')),
  created_at          timestamptz not null default now()
);

create table if not exists maintenances (
  id             uuid primary key default gen_random_uuid(),
  contrat_id     uuid not null references contrats(id) on delete cascade,
  numero_visite  integer not null,
  date_prevue    date not null,
  date_effective date,
  statut         text not null default 'a_venir' check (statut in ('a_venir','fait','retard')),
  notes          text,
  technicien_id  uuid references utilisateurs(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists interventions (
  id                  uuid primary key default gen_random_uuid(),
  echographe_id       uuid not null references echographes(id) on delete cascade,
  technicien_id       uuid references utilisateurs(id) on delete set null,
  type_intervention   text not null check (type_intervention in ('installation','panne','depannage','autre')),
  description         text,
  date_intervention   date not null default current_date,
  created_at          timestamptz not null default now()
);

create index if not exists idx_echographes_etablissement on echographes(etablissement_id);
create index if not exists idx_contrats_echographe on contrats(echographe_id);
create index if not exists idx_maintenances_contrat on maintenances(contrat_id);
create index if not exists idx_maintenances_date on maintenances(date_prevue);
create index if not exists idx_maintenances_technicien on maintenances(technicien_id);
create index if not exists idx_interventions_echographe on interventions(echographe_id);
create index if not exists idx_interventions_technicien on interventions(technicien_id);
