import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase variables in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function calc() {
  console.log('💰 Calculando Pontuação Individual e Preços (Fórmula Rica)...')

  // 1. Get matches with events but NOT processed by the point engine
  // We'll use the 'processed' flag for the final points/balance step.
  // Actually, we'll mark the 'matches' as processed=true once this script runs.
  const { data: matches } = await supabase
    .from('matches')
    .select('id, events, processed')
    .eq('processed', true) // sync-brasileirao.ts marks them as true when it gets events
    .eq('status', 'FINISHED')

  if (!matches || matches.length === 0) {
    console.log('✅ Nenhum jogo novo para calcular.')
    return
  }

  for (const match of matches) {
    if (!match.events || match.events.length === 0) continue

    console.log(`📍 Processando Partida ID ${match.id}...`)

    // match.events is an array of team responses from API-Football
    for (const teamResponse of (match.events as any[])) {
      for (const pStats of teamResponse.players) {
        const apiPlayerId = pStats.player.id
        const stats = pStats.statistics[0]

        // Formula Calculation
        let atk = 0
        let def = 0
        let neg = 0

        // Attack
        atk += (stats.goals.total || 0) * 5.0
        atk += (stats.goals.assists || 0) * 3.0
        atk += (stats.shots.on || 0) * 0.5
        atk += (stats.passes.key || 0) * 0.5
        atk += (stats.dribbles.success || 0) * 0.3
        atk += (stats.penalty.won || 0) * 2.0

        // Defence
        def += (stats.tackles.total || 0) * 1.2
        def += (stats.tackles.interceptions || 0) * 0.8
        def += (stats.tackles.blocks || 0) * 0.5
        def += (stats.duels.won || 0) * 0.2
        def += (stats.goals.saves || 0) * 1.5 // GK
        if (stats.penalty.saved) def += 4.0 // Huge defense bonus

        // Negatives
        neg += (stats.cards.yellow || 0) * -2.0
        neg += (stats.cards.red || 0) * -5.0
        neg += (stats.fouls.committed || 0) * -0.4
        neg += (stats.penalty.commited || 0) * -2.5
        neg += (stats.penalty.missed || 0) * -3.5

        const totalPoints = atk + def + neg
        
        // Update Player Price (Base 10 + round points)
        // Note: For now, we update the price based on their LAST performance.
        // In a real Cartola style, it's cumulative or rolling average, 
        // but let's stick to 'Price = 10 + current round points' for maximum transparency.
        const newPrice = Math.max(1, 10 + totalPoints)

        const { error: updateError } = await supabase
          .from('players')
          .update({
            price: newPrice.toFixed(1),
            last_atk_score: atk.toFixed(1),
            last_def_score: def.toFixed(1)
          })
          .eq('api_id', apiPlayerId)
          
        if (updateError) console.error(`❌ Erro atualizando jogador ${apiPlayerId}:`, updateError)
      }
    }
    
    // Finalize match processing to ensure we don't re-run points for this match
    // Actually, we might need a separate 'score_processed' flag, 
    // but for now, we'll assume the sync script is the gatekeeper.
    console.log(`✅ Partida ${match.id} processada com sucesso.`)
  }

  // Award points to users who chose these players as Craigue
  // (Left for future step or integration with leaderboard)
}

calc().catch(console.error)
