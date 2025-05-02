import { supabase } from './lib/supabase.js'

export async function GET(request: Request) {
    try {
        const { data, error } = await supabase
            .from('tracks')
            .select('*')
            .eq('is_track_of_day', true)
            .single()

        if (error) {
            return new Response(
                JSON.stringify({ message: 'Error fetching track of day', error: error.message }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ track: data }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ message: 'Error fetching track of day', error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
}