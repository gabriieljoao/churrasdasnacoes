import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../src/types/database.types'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  process.exit(1)
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

export async function finishRandomMatch() {
  console.log('🎲 Buscando uma partida não finalizada...')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'SCHEDULED')
    .limit(1)

  if (!matches || matches.length === 0) {
    console.log('❌ Nenhuma partida SCHEDULED encontrada.')
    return
  }

  const match = matches[0]
  
  // Random score
  const homeScore = Math.floor(Math.random() * 4) // 0 to 3
  const awayScore = Math.floor(Math.random() * 3) // 0 to 2

  console.log(`⚽ Simulando: Time ${match.home_team_id} [${homeScore}] x [${awayScore}] Time ${match.away_team_id}`)

  // Random events (Goals)
  const events: any[] = []

  if (homeScore > 0) {
    const { data: homePlayers } = await supabase.from('players').select('id').eq('team_id', match.home_team_id)
    if (homePlayers && homePlayers.length > 0) {
      for (let i = 0; i < homeScore; i++) {
        const randomPlayer = homePlayers[Math.floor(Math.random() * homePlayers.length)]
        events.push({ type: 'GOAL', player_id: randomPlayer.id, minute: Math.floor(Math.random() * 90) })
      }
    }
  }

  if (awayScore > 0) {
    const { data: awayPlayers } = await supabase.from('players').select('id').eq('team_id', match.away_team_id)
    if (awayPlayers && awayPlayers.length > 0) {
      for (let i = 0; i < awayScore; i++) {
        const randomPlayer = awayPlayers[Math.floor(Math.random() * awayPlayers.length)]
        events.push({ type: 'GOAL', player_id: randomPlayer.id, minute: Math.floor(Math.random() * 90) })
      }
    }
  }

  // Random Cards
  if (Math.random() > 0.5 && events.length > 0) {
     events.push({ type: 'YELLOW_CARD', player_id: events[0].player_id }) // yellow to the first scorer just for fun
  }

  const { error } = await supabase
    .from('matches')
    .update({ 
      home_score_ft: homeScore, 
      away_score_ft: awayScore, 
      status: 'FINISHED',
      events: events
    })
    .eq('id', match.id)

  if (error) {
    console.error('Erro ao finalizar partida:', error)
  } else {
    console.log(`✅ Partida ${match.id} finalizada com sucesso com ${events.length} eventos!`)
    console.log('👉 Agora você pode rodar: npx tsx scripts/calc-scores.ts')
  }
}

finishRandomMatch().catch(console.error)
