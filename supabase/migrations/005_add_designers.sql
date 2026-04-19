-- =============================================
-- 新增設計師帳號到 auth.users + profiles
-- 在 Supabase Studio > SQL Editor 執行
-- =============================================

DO $$
DECLARE
  susu_id    uuid := gen_random_uuid();
  xiaohua_id uuid := gen_random_uuid();
  vida_id    uuid := gen_random_uuid();
BEGIN

  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_token_current
  ) VALUES
  (
    susu_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'susu@design.internal', crypt('changeme-susu!', gen_salt('bf')),
    now(), now(), now(),
    '{"name":"酥酥","role":"designer"}',
    '{"provider":"email","providers":["email"]}',
    false, false, false, '', '', '', ''
  ),
  (
    xiaohua_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'xiaohua@design.internal', crypt('changeme-xiaohua!', gen_salt('bf')),
    now(), now(), now(),
    '{"name":"小花","role":"designer"}',
    '{"provider":"email","providers":["email"]}',
    false, false, false, '', '', '', ''
  ),
  (
    vida_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'vida@design.internal', crypt('changeme-vida!', gen_salt('bf')),
    now(), now(), now(),
    '{"name":"VIDA","role":"designer"}',
    '{"provider":"email","providers":["email"]}',
    false, false, false, '', '', '', ''
  )
  ON CONFLICT (email) DO NOTHING;

  -- trigger handle_new_user 自動建立 profile，但需確保 role=designer
  -- 若 trigger 未觸發（ON CONFLICT），手動更新
  UPDATE profiles
  SET role = 'designer'
  WHERE email IN (
    'susu@design.internal',
    'xiaohua@design.internal',
    'vida@design.internal'
  );

  RAISE NOTICE '設計師帳號建立完成：酥酥 / 小花 / VIDA';
END $$;
