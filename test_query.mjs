import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data: user } = await supabase.auth.signInWithPassword({
        email: 'guadalajara@cedis.com',
        password: 'password123'
    })
    console.log("Logged in:", user?.user?.email)

    const { data, error } = await supabase.rpc('get_fechas_ocupadas', {
        p_start_date: '2026-03-01', p_end_date: '2026-03-31'
    })
    console.log("RPC get_fechas_ocupadas data length:", data?.length)
    console.log("RPC data:", data)
    console.log("RPC get_fechas_ocupadas error:", error)

    const { data: sucursal } = await supabase.from('sucursales').select('*').eq('id', user?.user?.user_metadata?.sucursal_id).single()

    console.log("Testing insert...")
    const { data: insertData, error: insertError } = await supabase.from('pedidos').insert({
        codigo_pedido: `TEST-${Date.now()}`,
        sucursal_id: sucursal?.id || 'd168516e-1d54-48cd-bfd2-067dfde8fa22',
        fecha_entrega: '2026-03-20',
        tipo_entrega: 'HINO',
        total_kilos: 0,
        estado: 'pendiente_fecha'
    }).select()
    console.log("Insert result:", insertData, insertError)
}
test()
