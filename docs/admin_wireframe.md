# Admin Dashboard Wireframe (MVP)

```text
+--------------------------------------------------------------------------------+
| Admin Dashboard                                                                |
| [Search]                                 [Date Range] [Export]                 |
+----------------------+---------------------------------------------------------+
| NAV                  | METRICS                                                 |
| - Overview           | [Total Users] [Deposits Today] [Pending Payouts]        |
| - Users              | [Referral Commissions] [Wallet Balance Total]           |
| - Deposits           |                                                         |
| - Withdrawals        | PENDING PAYOUTS (Tue/Fri)                                |
| - Referrals          | - User | Amount | Method | Scheduled | Status | Actions  |
| - Reconciliation     |                                                         |
| - Settings           | RECONCILIATION                                          |
|                      | - PesaPal total vs ledger total                         |
|                      | - Mismatch alerts (>=0.1%)                               |
|                      |                                                         |
|                      | RECENT EVENTS                                            |
|                      | - Deposit success                                        |
|                      | - Bonus credited                                         |
|                      | - Withdrawal approved                                    |
+----------------------+---------------------------------------------------------+
| USER DETAIL PANEL (slide-out)                                                  |
| - Profile, Tier, Deposit, Wallet, Referrer, Referral tree summary              |
| - Manual payout action (enter M-PESA ref)                                      |
+--------------------------------------------------------------------------------+
```

Notes
1. Pending payouts list filters by scheduled date (Tue/Fri) and status.
2. Actions: Approve, Mark Paid, Reject (with reason).
3. Reconciliation view compares PesaPal transactions vs `deposits` ledger.

