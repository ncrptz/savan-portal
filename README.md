# SAVAN Certificate Portal

Certificate management and verification portal for Save Accident Victims Association of Nigeria (SAVAN).

## Stack
- **Frontend/Backend**: Next.js 14 (App Router)
- **Database & Auth**: Supabase
- **Hosting**: Vercel
- **Payments**: Paystack
- **Certificate Render**: Python (cairosvg, fontTools)

## Setup

### 1. Supabase
1. Create project at https://supabase.com
2. Run `src/lib/supabase/schema.sql` in SQL Editor
3. Create storage buckets: `certificates`, `photos`, `signatures`, `logos`
4. Copy project URL and keys to `.env.local`

### 2. Environment Variables
Copy `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_SECRET_KEY`

### 3. Persistent Assets
Copy `persistent_assets.json` from the render engine to `scripts/persistent_assets.json`

### 4. Python Dependencies (on server)
```bash
pip install fonttools cairosvg pillow numpy
```

### 5. Deploy to Vercel
```bash
npx vercel --prod
```
Then add custom domain: `verify.savan.medscienceeditors.com`

## Certificate Generation
Admin → Events → [Event] → Generate Certificates

Supports: single entry, bulk CSV/Excel/XML/DOCX/TXT upload

## User Roles
| Role | Access |
|------|--------|
| superadmin | Everything |
| admin1 | Events, certificates, organisations |
| admin2 | View and generate certificates |
| trainee | Own certificates, virtual courses |
| organisation | Register participants, view batch certs |
