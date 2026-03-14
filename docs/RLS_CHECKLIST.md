# RLS Checklist (MVP)

1. Enable RLS on tables: `users`, `wallets`, `deposits`, `transactions`, `video_views`, `referrals`, `payout_requests`, `audit_logs`.
2. Create helper `is_admin()` function that checks an admin flag/role on `users`.
3. `users` select policy: allow `auth.uid() = user_id` or admin.
4. `users` update policy: allow `auth.uid() = user_id` for non-sensitive fields; admin for any.
5. `users` insert policy: allow `auth.uid() = user_id`.
6. `wallets` select policy: allow `auth.uid() = user_id` or admin.
7. `wallets` insert/update/delete policy: deny for regular users; allow service role only.
8. `deposits` select policy: allow `auth.uid() = user_id` or admin.
9. `deposits` insert/update policy: service role only (webhook / backend).
10. `transactions` select policy: allow `auth.uid() = user_id` or admin.
11. `transactions` insert/update policy: service role only.
12. `video_views` select policy: allow `auth.uid() = user_id` or admin.
13. `video_views` insert policy: service role only (server-verified watch events).
14. `referrals` select policy: allow `auth.uid() = referrer_id` or `referred_user_id`, or admin.
15. `referrals` insert/update policy: service role only.
16. `payout_requests` select policy: allow `auth.uid() = user_id` or admin.
17. `payout_requests` insert policy: allow `auth.uid() = user_id`.
18. `payout_requests` update policy: admin/service role only.
19. `audit_logs` select/insert policy: admin/service role only.
20. Validate that all wallet updates go through security-definer functions (no direct client writes).
21. Add tests: user cannot read others' wallets/transactions; cannot insert ledger rows; admin can read all.
