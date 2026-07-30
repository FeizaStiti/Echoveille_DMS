-- Fusionne les établissements en doublon (même nom, à la casse ou aux espaces près)
-- en un seul établissement canonique, réattribue les échographes concernés,
-- puis pose une contrainte d'unicité pour empêcher que ça se reproduise.
--
-- À exécuter UNE FOIS sur votre base Supabase (SQL Editor), avant de réappliquer
-- schema.sql. Sans risque : aucune donnée n'est perdue, seuls les établissements
-- en double sont fusionnés (leurs échographes sont rattachés à la copie conservée).

-- 1. Pour chaque groupe de doublons (même nom en ignorant la casse/les espaces),
--    on choisit comme "canonique" l'établissement le plus ancien (created_at le plus petit).
with doublons as (
  select
    id,
    lower(trim(nom)) as cle,
    first_value(id) over (partition by lower(trim(nom)) order by created_at asc, id asc) as id_canonique
  from etablissements
)
-- 2. On réattribue tous les échographes des doublons vers l'établissement canonique.
update echographes e
set etablissement_id = d.id_canonique
from doublons d
where e.etablissement_id = d.id
  and d.id <> d.id_canonique;

-- 3. On supprime les établissements devenus orphelins (doublons fusionnés).
with doublons as (
  select
    id,
    first_value(id) over (partition by lower(trim(nom)) order by created_at asc, id asc) as id_canonique
  from etablissements
)
delete from etablissements et
using doublons d
where et.id = d.id
  and d.id <> d.id_canonique;

-- 4. On nettoie le nom canonique restant (supprime les espaces en trop).
update etablissements set nom = trim(nom);

-- 5. Verrou anti-doublon définitif : impossible d'avoir deux établissements
--    avec le même nom, à la casse et aux espaces près.
create unique index if not exists idx_etablissements_nom_unique
  on etablissements (lower(trim(nom)));

-- Vérification : cette requête doit maintenant renvoyer une seule ligne "Hannibal".
-- select * from etablissements where lower(nom) like '%hannibal%';
