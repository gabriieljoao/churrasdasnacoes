import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.API_FOOTBALL_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !apiKey) {
  console.error('❌ Missing variables in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const API_URL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 71 // Brasileirão Série A
const SEASON = 2024 // Mudando para 2024 para o plano gratuito

async function fetchAPI(endpoint: string) {
  const url = `${API_URL}${endpoint}`
  const res = await fetch(url, { 
    headers: { 
      'x-apisports-key': apiKey!,
    } 
  })
  if (!res.ok) throw new Error(`API Error: ${res.status} at ${url}`)
  const data = await res.json()
  console.log(`📡 API Response [${endpoint}]:`, JSON.stringify(data).substring(0, 500) + '...')
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API Business Error: ${JSON.stringify(data.errors)}`)
  }
  return data
}

async function sync() {
  console.log(`🔄 Sincronizando Brasileirão ${SEASON} (API-Football)...`)

  // 1. Get matches that are NOT processed in our DB
  const { data: ourMatches } = await supabase
    .from('matches')
    .select('id, api_id, status, processed, home_score_ft, away_score_ft')
    .eq('processed', false)
    
  if (!ourMatches || ourMatches.length === 0) {
    console.log('✅ Tudo sincronizado. Nenhuma partida pendente.')
    return
  }

  // 2. Fetch current status of ALL fixtures for the season
  const fixturesData = await fetchAPI(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`)
  const apiFixtures = fixturesData.response

  let updatedCount = 0

  for (const matchInDb of ourMatches) {
    const apiMatch = apiFixtures.find((f: any) => f.fixture.id === matchInDb.api_id)
    if (!apiMatch) continue

    const apiStatus = (apiMatch.fixture.status.short === 'FT') ? 'FINISHED' : 
                     (apiMatch.fixture.status.short === 'NS' ? 'SCHEDULED' : 'LIVE')
    
    const apiHome = apiMatch.goals.home
    const apiAway = apiMatch.goals.away

    const hasChanged = 
      matchInDb.home_score_ft !== apiHome || 
      matchInDb.away_score_ft !== apiAway || 
      matchInDb.status !== apiStatus

    if (hasChanged) {
      console.log(`[ATUALIZANDO] Jogo ${matchInDb.api_id}: ${apiHome}x${apiAway} (${apiStatus})`)
      
      let updatePayload: any = {
        home_score_ft: apiHome,
        away_score_ft: apiAway,
        status: apiStatus
      }

      // 3. DEEP SYNC: If finished, get player stats
      if (apiStatus === 'FINISHED') {
        console.log(`   🔎 Buscando telemetria individual para o jogo ${matchInDb.api_id}...`)
        const statsData = await fetchAPI(`/fixtures/players?fixture=${matchInDb.api_id}`)
        if (statsData.response && statsData.response.length > 0) {
          updatePayload.events = statsData.response
          updatePayload.processed = true // Mark for calc-scores.ts to process further
        }
      }

      const { error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', matchInDb.id)

      if (error) console.error(`❌ Erro no jogo ${matchInDb.api_id}:`, error)
      else updatedCount++
    }
  }

  console.log(`🏁 Sincronização concluída. ${updatedCount} mudanças detectadas.`)
}

sync().catch(console.error)
