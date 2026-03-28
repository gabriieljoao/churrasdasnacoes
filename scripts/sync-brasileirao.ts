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

  // 1. Get matches that are NOT finished in our DB to compare
  const { data: ourMatches } = await supabase
    .from('matches')
    .select('id, home_team_id, away_team_id, home_score_ft, away_score_ft, status')
    .neq('status', 'FINISHED')
    
  if (!ourMatches || ourMatches.length === 0) {
    console.log('✅ Nenhuma partida em aberto no banco para sincronizar.')
    return
  }

  // 2. Map teams to IDs for comparison
  const { data: teams } = await supabase.from('teams').select('id, name')
  const nameToDbId = new Map(teams?.map(t => [t.name, t.id]))

  // 3. Fetch current status of ALL matches (or just target the season)
  // We use the broad /matches endpoint to get live + finished in one go
  const matchesData = await fetchAPI('/competitions/BSA/matches?season=2026')
  const apiMatches = matchesData.matches.filter((m: any) => 
    m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE'
  )

  let updatedCount = 0

  for (const apiMatch of apiMatches) {
    const homeName = apiMatch.homeTeam.shortName || apiMatch.homeTeam.name
    const awayName = apiMatch.awayTeam.shortName || apiMatch.awayTeam.name
    
    const dbHomeId = nameToDbId.get(homeName)
    const dbAwayId = nameToDbId.get(awayName)

    if (!dbHomeId || !dbAwayId) continue

    // Find if we have this specific match record active
    const matchInDb = ourMatches.find(m => m.home_team_id === dbHomeId && m.away_team_id === dbAwayId)

    if (matchInDb) {
      const apiHome = apiMatch.score.fullTime.home
      const apiAway = apiMatch.score.fullTime.away
      // API status mapping
      const apiStatus = (apiMatch.status === 'FINISHED') ? 'FINISHED' : 'LIVE'
      
      // COMPARISON: Only write to Supabase if data actually changed
      const hasChanged = 
        matchInDb.home_score_ft !== apiHome || 
        matchInDb.away_score_ft !== apiAway || 
        matchInDb.status !== apiStatus

      if (hasChanged) {
        console.log(`[ATUALIZANDO] ${homeName} ${matchInDb.home_score_ft ?? 0}x${matchInDb.away_score_ft ?? 0} -> ${apiHome}x${apiAway} (${apiStatus})`)
        
        const { error } = await supabase
          .from('matches')
          .update({
            home_score_ft: apiHome,
            away_score_ft: apiAway,
            status: apiStatus
          })
          .eq('id', matchInDb.id)

        if (error) console.error(`❌ Erro em ${homeName} vs ${awayName}:`, error)
        else updatedCount++
      }
    }
  }

  console.log(`🏁 Sincronização concluída. ${updatedCount} mudanças detectadas.`)
  if (updatedCount > 0) {
    console.log('👉 Rodando cálculo de pontuação automático...')
    // Note: In GitHub Actions, we run calc-scores.ts in the next step anyway.
  }
}

sync().catch(console.error)
