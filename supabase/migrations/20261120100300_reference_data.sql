-- BOLD UP — reference data shipped with the schema (not demo data).

insert into public.sports (slug, name_fr, name_en, icon, sort_order) values
  ('boxe', 'Boxe', 'Boxing', 'boxing', 10),
  ('musculation', 'Musculation', 'Strength training', 'dumbbell', 20),
  ('fitness', 'Fitness', 'Fitness', 'activity', 30),
  ('running', 'Running', 'Running', 'footprints', 40),
  ('yoga', 'Yoga', 'Yoga', 'flower', 50),
  ('pilates', 'Pilates', 'Pilates', 'circle-dot', 60),
  ('cross-training', 'Cross-training', 'Cross-training', 'flame', 70),
  ('natation', 'Natation', 'Swimming', 'waves', 80),
  ('preparation-physique', 'Préparation physique', 'Physical conditioning', 'zap', 90),
  ('remise-en-forme', 'Remise en forme', 'Getting back in shape', 'heart-pulse', 100)
on conflict (slug) do nothing;

-- Which supporting documents Bold Up asks for. `is_required` is platform policy and can
-- be changed by an admin: it is not a statement of what the law requires in every case.
insert into public.document_types (code, name_fr, name_en, hint_fr, hint_en, is_required, has_expiry, sort_order) values
  (
    'carte_pro',
    'Carte professionnelle d''éducateur sportif',
    'Professional sports educator card',
    'Délivrée par l''État, elle atteste que vous pouvez encadrer contre rémunération. Recto et verso lisibles.',
    'Issued by the French State. It shows you are allowed to coach for payment. Both sides, readable.',
    true, true, 10
  ),
  (
    'insurance',
    'Assurance responsabilité civile professionnelle',
    'Professional liability insurance',
    'Attestation en cours de validité, à votre nom.',
    'A current certificate in your name.',
    true, true, 20
  ),
  (
    'diploma',
    'Diplôme ou titre (BPJEPS, DEJEPS, STAPS, CQP…)',
    'Diploma or qualification (BPJEPS, DEJEPS, STAPS, CQP…)',
    'Le diplôme qui correspond aux disciplines que vous encadrez.',
    'The qualification that matches the disciplines you coach.',
    false, false, 30
  ),
  (
    'registration',
    'Justificatif d''activité (SIRET, URSSAF)',
    'Business registration (SIRET, URSSAF)',
    'Avis de situation SIRENE ou attestation URSSAF, si vous en avez un.',
    'SIRENE notice or URSSAF certificate, if you have one.',
    false, false, 40
  ),
  (
    'other',
    'Autre justificatif',
    'Other supporting document',
    'Tout document utile à l''étude de votre dossier.',
    'Anything useful for reviewing your application.',
    false, false, 50
  )
on conflict (code) do nothing;
