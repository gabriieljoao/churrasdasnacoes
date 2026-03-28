import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.FOOTBALL_DATA_API_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !apiKey) {
  console.error('❌ Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or FOOTBALL_DATA_API_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function fetchAPI(endpoint: string) {
  const url = `https://api.football-data.org/v4${endpoint}`
  const res = await fetch(url, { headers: { 'X-Auth-Token': apiKey! } })
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText} at ${url}`)
  return res.json()
}

async function seed() {
  console.log('🌱 Buscando times do Brasileirão Série A na API...')
  
  const competition = await fetchAPI('/competitions/BSA/teams')
  const apiTeams = competition.teams

  console.log('🚮 Removendo dados antigos...')
  await supabase.from('round_craques').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('score_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  // We don't delete STARTING_BALANCE directly because the DB might not have a clean way without deleting all.
  // Actually, we'll delete all and re-add STARTING_BALANCE for everyone so they have 10 again.
  await supabase.from('matches').delete().neq('id', 0)
  await supabase.from('players').delete().neq('id', 0)
  await supabase.from('teams').delete().neq('id', 0)
  
  const { data: profiles } = await supabase.from('profiles').select('id')
  if (profiles && profiles.length > 0) {
    const ledgers = profiles.map(p => ({
      user_id: p.id,
      reason: 'STARTING_BALANCE',
      points: 10
    }))
    await supabase.from('score_ledger').insert(ledgers)
    console.log(`✅ Restaurado 10 moedas de saldo para ${profiles.length} usuários`)
  }

  // App Config
  await supabase.from('app_config').upsert({ id: true, phase: 'PRE_COPA', draft_open: true })

  // Teams
  console.log('⚽ Inserindo Times...')
  const cleanTeams = apiTeams.map((t: any) => ({
    name: t.shortName || t.name,
    country_code: t.tla || 'BR',
    group_letter: 'A', // Forcing 'A' so the app UI grouping doesn't crash
    flag_url: t.crest
  }))

  const { data: insertedTeams, error: teamsError } = await supabase
    .from('teams')
    .insert(cleanTeams)
    .select()

  if (teamsError) throw teamsError
  console.log(`✅ ${insertedTeams.length} times inseridos`)

  // Players
  console.log('🏃‍♂️ Inserindo Jogadores Gênéricos (Economia Base)...')
  const PLAYERS: any[] = []
  insertedTeams.forEach((team: any) => {
    PLAYERS.push({ name: `Atacante do ${team.name}`, team_id: team.id, position: 'Atacante', price: 10 })
    PLAYERS.push({ name: `Meia do ${team.name}`, team_id: team.id, position: 'Meio-campo', price: 10 })
    PLAYERS.push({ name: `Zagueiro do ${team.name}`, team_id: team.id, position: 'Zagueiro', price: 10 })
  })

  await supabase.from('players').insert(PLAYERS)
  
  // API uses its own IDs for homeTeam/awayTeam. We need to map Name -> Supabase ID.
  const nameToDbId = new Map(insertedTeams.map((t: any) => [t.name, t.id]))

  console.log('📅 Buscando Partidas da Rodada 1...')
  // Try fetching current matchday matches, or matchday=1
  const matchesData = await fetchAPI('/competitions/BSA/matches?matchday=1')
  const apiMatches = matchesData.matches

  const matches = apiMatches.map((m: any) => {
    const homeName = m.homeTeam.shortName || m.homeTeam.name
    const awayName = m.awayTeam.shortName || m.awayTeam.name
    
    return {
      home_team_id: nameToDbId.get(homeName),
      away_team_id: nameToDbId.get(awayName),
      group_letter: 'A',
      stage: 'GROUP_STAGE',
      round_number: m.matchday,
      match_day: 1, // Visual ordering
      starts_at: m.utcDate,
      status: m.status === 'FINISHED' ? 'FINISHED' : 'SCHEDULED',
      home_score_ft: m.score?.fullTime?.home ?? null,
      away_score_ft: m.score?.fullTime?.away ?? null,
      processed: false
    }
  }).filter((m: any) => m.home_team_id && m.away_team_id)

  const { error: matchesError } = await supabase.from('matches').insert(matches)
  if (matchesError) throw matchesError

  console.log(`✅ ${matches.length} partidas inseridas`)
  console.log('🎉 Tudo pronto! Execute o app ou o sync script.')
}

seed().catch(console.error)
