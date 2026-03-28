import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../src/types/database.types'

// Load environment variables (.env should have SUPABASE_SERVICE_ROLE_KEY)
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

// Bypass RLS completely for background jobs
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

export async function processScores() {
  console.log('🔄 Checking for unprocessed finished matches...')

  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'FINISHED')
    .eq('processed', false)

  if (matchErr) throw matchErr
  if (!matches || matches.length === 0) {
    console.log('✅ All finished matches have already been processed.')
    return
  }

  console.log(`Found ${matches.length} unprocessed finished matches. Calculating scores...`)

  // Cache lookups
  const ledgers: any[] = []
  
  for (const match of matches) {
    const homeScore = match.home_score_ft ?? match.home_score ?? 0
    const awayScore = match.away_score_ft ?? match.away_score ?? 0
    const diff = Math.abs(homeScore - awayScore)

    // 1. DRAFT PICKS (Teams)
    // Fetch all users who picked these teams
    const { data: picks } = await supabase
      .from('draft_picks')
      .select('user_id, team_id')
      .in('team_id', [match.home_team_id, match.away_team_id])

    if (picks) {
      for (const pick of picks) {
        const isHome = pick.team_id === match.home_team_id
        const isAway = pick.team_id === match.away_team_id
        
        let won = false
        let drew = false
        
        if (isHome && homeScore > awayScore) won = true
        if (isAway && awayScore > homeScore) won = true
        if (homeScore === awayScore) drew = true

        // Win/Draw base points
        if (won) ledgers.push({ user_id: pick.user_id, match_id: match.id, round_number: match.round_number, reason: 'WIN', points: 3 })
        if (drew) ledgers.push({ user_id: pick.user_id, match_id: match.id, round_number: match.round_number, reason: 'DRAW', points: 1 })
        
        // Blowout bonus
        if (won && diff >= 3) {
          ledgers.push({ user_id: pick.user_id, match_id: match.id, round_number: match.round_number, reason: 'BLOWOUT', points: 5 })
        }

        // Goals base points
        const teamGoals = isHome ? homeScore : awayScore
        if (teamGoals > 0) {
          // Give 1 point per goal
          for (let g = 0; g < teamGoals; g++) {
            ledgers.push({ user_id: pick.user_id, match_id: match.id, round_number: match.round_number, reason: 'GOAL', points: 1 })
          }
        }
      }
    }

    // 2. PREDICTIONS (Chutômetro)
    const { data: predictions } = await supabase
      .from('predictions')
      .select('user_id, predicted_home, predicted_away')
      .eq('match_id', match.id)

    if (predictions) {
      for (const pred of predictions) {
        const exact = pred.predicted_home === homeScore && pred.predicted_away === awayScore
        const predDiff = pred.predicted_home - pred.predicted_away
        const actualDiff = homeScore - awayScore
        const winnerExact = Math.sign(predDiff) === Math.sign(actualDiff)

        if (exact) {
           ledgers.push({ user_id: pred.user_id, match_id: match.id, round_number: match.round_number, reason: 'PREDICTION_EXACT', points: 5 })
        } else if (winnerExact) {
           ledgers.push({ user_id: pred.user_id, match_id: match.id, round_number: match.round_number, reason: 'PREDICTION_WINNER', points: 2 })
        }
      }
    }

    // 3. CRAQUE ECONOMY AND MATCH EVENTS
    // events format expected: [{ type: 'GOAL'|'YELLOW_CARD'|'RED_CARD', player_id: number }]
    const events = (match.events as any[]) || []
    
    // Process Craque Goals
    const goalScorers = events.filter(e => e.type === 'GOAL').map(e => e.player_id)
    
    if (goalScorers.length > 0) {
      const { data: craques } = await supabase
        .from('round_craques')
        .select('user_id, player_id')
        .eq('round_number', match.round_number)
        .in('player_id', goalScorers)

      if (craques) {
        for (const cq of craques) {
          // Add 2 points per recorded goal for this craque
          const goalsScored = goalScorers.filter(id => id === cq.player_id).length
          for (let i = 0; i < goalsScored; i++) {
             ledgers.push({ user_id: cq.user_id, match_id: match.id, round_number: match.round_number, reason: 'CRAQUE_GOAL', points: 2 })
          }
        }
      }
    }

    // 4. INFLATION / DEFLATION OF MARKET VALUE (CARTOLA STYLE)
    // Update player prices based on events + penalty for blanks
    // Get all players that played (from both teams)
    const { data: matchPlayers } = await supabase
      .from('players')
      .select('id, price')
      .in('team_id', [match.home_team_id, match.away_team_id])

    if (matchPlayers) {
      for (const p of matchPlayers) {
        let newPrice = p.price || 10
        const playerEvents = events.filter(e => e.player_id === p.id)
        
        let involvedInHighlight = false
        
        for (const ev of playerEvents) {
          if (ev.type === 'GOAL') { newPrice += 2; involvedInHighlight = true }
          if (ev.type === 'YELLOW_CARD') { newPrice -= 1; involvedInHighlight = true }
          if (ev.type === 'RED_CARD') { newPrice -= 3; involvedInHighlight = true }
        }

        // If player didn't score or even get carded (blank), price drops slightly to force market movement
        if (!involvedInHighlight) {
          newPrice -= 1
        }

        // Hard floor of 1 coin
        if (newPrice < 1) newPrice = 1

        if (newPrice !== p.price) {
          await supabase.from('players').update({ price: newPrice }).eq('id', p.id)
        }
      }
    }

    // Finally marks the match as processed
    await supabase.from('matches').update({ processed: true }).eq('id', match.id)
    console.log(`✅ Match ${match.home_team_id} vs ${match.away_team_id} processed.`)
  }

  // Insert all points won!
  if (ledgers.length > 0) {
    const { error } = await supabase.from('score_ledger').insert(ledgers)
    if (error) console.error('Error inserting ledgers:', error)
    else console.log(`🎉 Insered ${ledgers.length} new point events into the ledger!`)
  }

  console.log('🏁 Scoring calculation complete.')
}

processScores().catch(console.error)
