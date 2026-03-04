/**
 * CEDIS Pedidos — Setup Superadmins
 * 
 * Creates the two superadmin accounts:
 *   - auxiliaralmacen@clorodehidalgo.com
 *   - alejandro2310.am@gmail.com
 * 
 * Run: node scripts/setup-users.mjs
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

function req(method, url, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null
        const parsed = new URL(url)
        const r = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method,
            headers: {
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            }
        }, res => {
            let raw = ''
            res.on('data', c => raw += c)
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }) }
                catch { resolve({ status: res.statusCode, body: raw }) }
            })
        })
        r.on('error', reject)
        if (data) r.write(data)
        r.end()
    })
}

const SUPERADMINS = [
    {
        email: 'auxiliar.almacen@clorodehidalgo.com',
        password: 'CEDIS_Admin2024!',
        nombre: 'Administrador CEDIS',
    },
    {
        email: 'alejandro2310.am@gmail.com',
        password: 'CEDIS_Super2024!',
        nombre: 'Alejandro — Superadmin',
    },
]

async function main() {
    console.log('\n🔑 CEDIS Pedidos — Setup Superadmins\n')

    // List all existing auth users
    const listRes = await req('GET', `${SUPABASE_URL}/auth/v1/admin/users?per_page=100`)
    const existingUsers = listRes.body?.users || []
    console.log(`📋 Found ${existingUsers.length} existing auth users`)

    for (const admin of SUPERADMINS) {
        console.log(`\n▶ ${admin.email}`)

        const existing = existingUsers.find(u => u.email === admin.email)
        let userId = existing?.id

        if (existing) {
            console.log(`  User exists (${userId?.slice(0, 8)}...), resetting password...`)
            const upd = await req('PUT', `${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
                password: admin.password,
                email_confirm: true,
            })
            if (upd.status === 200) {
                console.log(`  ✅ Password updated`)
            } else {
                console.error(`  ❌ Update failed:`, JSON.stringify(upd.body).slice(0, 200))
            }
        } else {
            console.log(`  Creating new auth user...`)
            const createRes = await req('POST', `${SUPABASE_URL}/auth/v1/admin/users`, {
                email: admin.email,
                password: admin.password,
                email_confirm: true,
            })
            if (createRes.status === 200 || createRes.status === 201) {
                userId = createRes.body?.id
                console.log(`  ✅ Created: ${userId?.slice(0, 8)}...`)
            } else {
                console.error(`  ❌ Create failed (${createRes.status}):`, JSON.stringify(createRes.body).slice(0, 200))
                continue
            }
        }

        if (!userId) continue

        // Upsert profile with superadmin flags
        const profileRes = await req('POST', `${SUPABASE_URL}/rest/v1/users`, {
            id: userId,
            email: admin.email,
            nombre: admin.nombre,
            rol: 'admin',
            sucursal_id: null,
            estado_cuenta: 'activo',
            es_superadmin: true,
        })

        if (profileRes.status === 201) {
            console.log(`  ✅ Profile created (superadmin)`)
        } else if (profileRes.status === 409 || profileRes.status === 200) {
            // Already exists, update it
            const patchRes = await req('PATCH', `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
                nombre: admin.nombre, rol: 'admin', estado_cuenta: 'activo', es_superadmin: true,
            })
            console.log(`  ${patchRes.status === 204 ? '✅ Profile updated (superadmin)' : '⚠️  Profile ' + patchRes.status}`)
        } else {
            console.error(`  ⚠️  Profile error (${profileRes.status}):`, JSON.stringify(profileRes.body).slice(0, 200))
            console.log('  ℹ️  You can run the SQL manually to fix the profile:')
            console.log(`  UPDATE users SET estado_cuenta='activo', es_superadmin=true, rol='admin' WHERE email='${admin.email}';`)
        }
    }

    console.log('\n─────────────────────────────────────────')
    console.log('🎉 Done! Superadmin credentials:')
    console.log('')
    for (const a of SUPERADMINS) {
        console.log(`  📧 ${a.email}`)
        console.log(`  🔑 ${a.password}`)
        console.log('')
    }
    console.log('Open: http://localhost:5173')
    console.log('─────────────────────────────────────────\n')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
