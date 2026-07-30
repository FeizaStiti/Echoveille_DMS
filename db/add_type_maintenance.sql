-- Ajoute 'maintenance' comme type d'intervention valide.
-- À exécuter une fois dans Supabase (SQL Editor). Sans risque, ne touche à
-- aucune donnée existante, juste à la règle de validation.

alter table interventions drop constraint if exists interventions_type_intervention_check;
alter table interventions add constraint interventions_type_intervention_check
  check (type_intervention in ('installation','panne','depannage','maintenance','autre'));
