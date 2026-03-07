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
    console.log('\n🗄️  CEDIS Pedidos — Apply SQL from argument\n')
    const sqlFile = process.argv[2]
    if (!sqlFile) {
        console.error('Provee un archivo sql como argumento')
        process.exit(1)
    }

    const sqlContent = readFileSync(resolve(__dirname, '..', sqlFile), 'utf-8')
    const statements = sqlContent.split(';').map(s => s.trim()).filter(Boolean)

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        console.log(`Ejecutando statement ${i + 1}/${statements.length}...`)
        const r = await runSQL(stmt + ';')
        console.log(`   Status: ${r.status}`)
        if (r.status !== 200 && r.status !== 201) {
            console.error(`   Error details:`, r.body)
        } else {
            console.log(`   Result:`, r.body)
        }
    }

    console.log('\n✅ Ok!')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
