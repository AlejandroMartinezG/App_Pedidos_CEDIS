import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Material, Categoria } from '@/lib/types'

export function useMateriales(categoria?: Categoria) {
    const [materiales, setMateriales] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let query = supabase
            .from('materiales')
            .select('*')
            .order('orden', { ascending: true })

        if (categoria) query = query.eq('categoria', categoria)

        query.then(({ data, error }) => {
            if (error) setError(error.message)
            else setMateriales((data as Material[]) ?? [])
            setLoading(false)
        })
    }, [categoria])

    return { materiales, loading, error }
}
