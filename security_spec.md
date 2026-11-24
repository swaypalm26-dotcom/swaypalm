# SwayPalm Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Immutable UUID Keys & Separation from Mutable Fields**:
   - Every core collection uses an immutable auto-generated RFC-4122 UUID primary key: `users.id`, `businesses.business_id`, `products.product_id`, `posts.post_id`, `orders.order_id`, `chats.chat_id` (plus UUIDs for supporting collections).
   - Mutable attributes (`email`, `phone`, `displayName`, `business_name`) are NEVER used as primary keys or foreign keys.
   - All foreign keys reference immutable UUIDs: `products.business_id -> businesses.business_id`, `posts.user_id -> users.id`, `orders.buyer_id -> users.id`, `orders.seller_id -> users.id`, and `chats.participant_user_ids -> users.id[]` (never names).
2. **Auth-to-UUID Link & PII Isolation**:
   - `/userAuthLinks/{authUid}` stores zero PII (`auth_uid`, `user_id`) and maps Firebase Auth UID to immutable `users.id`.
   - User emails, phone numbers, and personal account settings reside strictly in `/users/{id}` and are readable only by the owner (`existing().auth_uid == request.auth.uid`) or a verified admin.
   - Users can update `displayName`, `email`, `phone`, `country`, `city`, and `businessType` without changing `users.id` or `businesses.business_id`.
3. **Self-Assigned Role Prevention**: Users registering in `/users/{id}` must have `role == 'member'`, `plan == 'free'`, `verified == false`, and `status == 'active'`. Only admins can assign `role: 'admin'` or `status: 'blocked'`.
4. **Atomic Subscription Upgrades**: Upgrading `plan` and `verified` on `/users/{id}` or `/businesses/{business_id}` requires an atomic `/payments/{payment_id}` creation verified via `existsAfter()`.
5. **Master Gate on Subcollections**: Access to `/chats/{chatId}/messages/{messageId}` requires the caller to be in `/chats/{chatId}.participant_auth_uids` and `participant_user_ids`. Direct chats (`type == 'direct'`) cannot store a `name` field or `participantLabels`.
6. **Immutable Ownership & Timestamps**: `id`, `business_id`, `user_id`, `buyer_id`, `seller_id`, `auth_uid`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time` for standard user writes.
7. **Verified Email Mandate**: All authenticated write operations require `request.auth.token.email_verified == true`.
8. **No Blanket List Reads**: Every `allow list` rule evaluates `resource.data` directly (no `get()` calls inside `allow list`).
9. **Automatic 10% Platform Sales Commission**: Every marketplace order under `/orders/{orderId}` enforces 10% platform fee / 90% seller net arithmetic invariants and terminal `'delivered'` locking.
10. **$12 Pay-Per-Ad Enforcement & Guest Isolation**: Both verified users (`user_id == myUserUuid()`) and unauthenticated guests (`user_id == GUEST_USER_ID`, `business_id == GUEST_BUSINESS_ID`, `auth_uid == 'guest'`) may create `/adverts/{advertId}` with `priceUsd == 12`, `paymentStatus == 'paid'`, and an atomic `/payments/{paymentId}` doc (`existsAfter` + `getAfter`).

## 2. Adversarial Payloads Covered
1. **Shadow Role Escalation (`users`)**: `{ "id": "<uuid>", "role": "admin", "plan": "premium", "verified": true }` -> **REJECTED**.
2. **Email/Name/Non-UUID PK Injection (`users`, `products`, `posts`, `orders`, `chats`)**: Creating document with `email`, `phone`, or `biz_...` instead of a 36-char UUID -> **REJECTED** (`isValidUuid()` gate).
3. **Direct Chat Name / Label Leak (`chats`)**: Creating a `type: 'direct'` chat containing `name` or `participantLabels` -> **REJECTED** (`!('name' in incoming())` & `keys().hasOnly(...)`).
4. **PII Scrape (`users`)**: Non-owner reading `/users/{targetUuid}` -> **REJECTED** (`auth_uid == request.auth.uid || isAdmin()`).
5. **Email Spoof Without Verification (`admins`)**: Admin email without `email_verified: true` -> **REJECTED**.
6. **Orphan Chat Message (`chats/c1/messages/m1`)**: Non-participant reading/writing message -> **REJECTED**.
7. **Foreign Key Spoofing (`products`, `posts`, `orders`)**: Setting `user_id` or `buyer_id` to another user's UUID -> **REJECTED** (`== myUserUuid()`).
8. **Payment-less Plan Upgrade (`businesses`)**: Upgrading `plan`/`verified` without atomic `/payments/{lastPaymentId}` -> **REJECTED**.
9. **Terminal Order Mutation & 10% Fee Bypass (`orders`)**: Modifying immutable `buyer_id`/`seller_id`/`totalAmount` or bypassing 10% fee -> **REJECTED**.
10. **Free / Unpaid Ad Bypass (`adverts`)**: Creating `/adverts/{advertId}` without atomic $12 `/payments/{paymentId}` -> **REJECTED**.
