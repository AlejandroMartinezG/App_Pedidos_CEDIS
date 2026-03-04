/**
 * CEDIS Pedidos — Apply DB Migration
 * Adds estado_cuenta + es_superadmin columns to users table
 * Creates solicitudes_acceso table
 * 
 * Run: node scripts/apply-migration.mjs
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
const env = Object.fromEntries(
    envFile.split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const SUPABASE_URL = env['VITE_SUPABASE_URL']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

function apiPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body)
        const r = https.request({
            hostname: 'api.supabase.com',
            path,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            }
        }, res => {
            let raw = ''
            res.on('data', c => raw += c)
            res.on('end', () => resolve({ status: res.statusCode, body: raw }))
        })
        r.on('error', reject)
        r.write(data)
        r.end()
    })
}

async function runSQL(query) {
    const res = await apiPost(`/v1/projects/${PROJECT_REF}/database/query`, { query })
    return res
}

async function main() {
    console.log('\n🗄️  CEDIS Pedidos — Apply DB Migration\n')

    console.log('1️⃣  Adding estado_cuenta column to users...')
    const r1 = await runSQL(`ALTER TABLE users ADD COLUMN IF NOT EXISTS estado_cuenta text NOT NULL DEFAULT 'activo' CHECK (estado_cuenta IN ('pendiente','activo','inactivo'))`)
    console.log(`   Status: ${r1.status}`, r1.status !== 200 ? r1.body.slice(0, 200) : '✅')

    console.log('2️⃣  Adding es_superadmin column to users...')
    const r2 = await runSQL(`ALTER TABLE users ADD COLUMN IF NOT EXISTS es_superadmin boolean NOT NULL DEFAULT false`)
    console.log(`   Status: ${r2.status}`, r2.status !== 200 ? r2.body.slice(0, 200) : '✅')

    console.log('3️⃣  Creating solicitudes_acceso table...')
    const r3 = await runSQL(`
    CREATE TABLE IF NOT EXISTS solicitudes_acceso (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      nombre text NOT NULL,
      email text NOT NULL,
      sucursal_id uuid REFERENCES sucursales(id),
      mensaje text,
      estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado')),
      revisado_por uuid REFERENCES users(id),
      revisado_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `)
    console.log(`   Status: ${r3.status}`, r3.status !== 200 ? r3.body.slice(0, 200) : '✅')

    console.log('4️⃣  Enabling RLS + policies on solicitudes_acceso...')
    const r4 = await runSQL(`
    ALTER TABLE solicitudes_acceso ENABLE ROW LEVEL SECURITY;
    CREATE POLICY IF NOT EXISTS "sol_admin_sel" ON solicitudes_acceso FOR SELECT
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'));
    CREATE POLICY IF NOT EXISTS "sol_admin_upd" ON solicitudes_acceso FOR UPDATE
      USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'admin'));
    CREATE POLICY IF NOT EXISTS "sol_insert" ON solicitudes_acceso FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
    CREATE POLICY IF NOT EXISTS "sol_own_sel_2" ON solicitudes_acceso FOR SELECT
      USING (user_id = auth.uid())
  `)
    console.log(`   Status: ${r4.status}`, r4.status !== 200 ? r4.body.slice(0, 200) : '✅')

    console.log('\n✅ Migration complete! Now run: node scripts/setup-users.mjs\n')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
