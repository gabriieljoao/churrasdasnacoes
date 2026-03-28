import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.FOOTBALL_DATA_API_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !apiKey) {
  console.error('❌ Missing variables in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function fetchAPI(endpoint: string) {
  const url = `https://api.football-data.org/v4${endpoint}`
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey! } })
  if (!res.ok) throw new Error(`API Error: ${res.status} at ${url}`)
  return res.json()
}

async function sync() {
  console.log('🔄 Sincronizando partidas do Brasileirão Série A...')

  // Get matches currently SCHEDULED in our DB
  const { data: ourMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id')
    .eq('status', 'SCHEDULED')
    
  if (!ourMatches || ourMatches.length === 0) {
    console.log('Nenhuma partida aguardando resultado.')
    return
  }

  // To map home/away to our DB, we need the teams
  const { data: teams } = await supabase.from('teams').select('id, name')
  const nameToDbId = new Map(teams?.map(t => [t.name, t.id]))

  // Fetch only finished matches from the API
  const matchesData = await fetchAPI('/competitions/BSA/matches?status=FINISHED')
  const finishedApiMatches = matchesData.matches

  let updatedCount = 0

  for (const apiMatch of finishedApiMatches) {
    const homeName = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name
    const awayName = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name
    
    const dbHomeId = nameToDbId.get(homeName)
    const dbAwayId = nameToDbId.get(awayName)

    // Check if we have this match as SCHEDULED
    const matchToUpdate = ourMatches.find(m => m.home_team_id === dbHomeId && m.away_team_id === dbAwayId)

    if (matchToUpdate) {
      console.log(`Atualizando resultado: ${homeName} ${apiMatch.score.fullTime.home} x ${apiMatch.score.fullTime.away} ${awayName}`)
      
      const { error } = await supabase
        .from('matches')
        .update({
          home_score_ft: apiMatch.score.fullTime.home,
          away_score_ft: apiMatch.score.fullTime.away,
          status: 'FINISHED'
          // Events like GOAL, RED_CARD are not available in the free tier of football-data for matches natively.
          // For the free tier, we will skip player economy variations from events.
        })
        .eq('id', matchToUpdate.id)

      if (error) console.error('Erro ao atualizar:', error)
      else updatedCount++
    }
  }

  console.log(`✅ Sincronização concluída. ${updatedCount} partidas finalizadas!`)
  if (updatedCount > 0) {
    console.log('👉 Agora rode: npx tsx scripts/calc-scores.ts para distribuir os pontos.')
  }
}

sync().catch(console.error)
