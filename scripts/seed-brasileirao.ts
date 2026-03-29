import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.API_FOOTBALL_KEY

if (!supabaseUrl) { console.error('❌ Falta a variável: VITE_SUPABASE_URL (veja se o segredo SUPABASE_URL existe no GitHub)'); process.exit(1); }
if (!supabaseServiceRoleKey) { console.error('❌ Falta a variável: SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!apiKey) { console.error('❌ Falta a variável: API_FOOTBALL_KEY'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
const API_URL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 71 // Brasileirão Série A
const SEASON = 2026

async function fetchAPI(endpoint: string) {
  const url = `${API_URL}${endpoint}`
  const res = await fetch(url, { 
    headers: { 
      'x-apisports-key': apiKey!,
      'x-rapidapi-key': apiKey!,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    } 
  })
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText} at ${url}`)
  const data = await res.json()
  console.log(`📡 API Response [${endpoint}]:`, JSON.stringify(data).substring(0, 500) + '...')
  
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API Business Error: ${JSON.stringify(data.errors)}`)
  }
  return data
}

async function seed() {
  console.log(`🌱 Iniciando Carga de Dados (Brasileirão ${SEASON})...`)

  console.log('🚮 Removendo dados antigos (Limpeza profunda)...')
  await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('knockout_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('draft_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('round_craques').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('score_ledger').delete().neq('reason', 'STARTING_BALANCE')
  await supabase.from('matches').delete().neq('id', 0)
  await supabase.from('players').delete().neq('id', 0)
  await supabase.from('teams').delete().neq('id', 0)
  
  // 1. TEAMS
  console.log('⚽ Buscando Times...')
  let teamsData = await fetchAPI(`/teams?league=${LEAGUE_ID}&season=${SEASON}`)
  let apiTeams = teamsData.response

  if (!apiTeams || apiTeams.length === 0) {
    console.warn(`⚠️ Aviso: Nenhum time em ${SEASON}. Tentando temporada anterior (2025)...`)
    teamsData = await fetchAPI(`/teams?league=${LEAGUE_ID}&season=2025`)
    apiTeams = teamsData.response
  }

  if (!apiTeams || apiTeams.length === 0) {
    console.error('❌ ERRO: Não foi possível encontrar times nem em 2026 nem em 2025.')
    return
  }

  const cleanTeams = apiTeams.map((item: any) => ({
    name: item.team.name,
    country_code: 'BR',
    group_letter: 'A',
    flag_url: item.team.logo,
    api_id: item.team.id
  }))

  const { data: insertedTeams, error: teamsError } = await supabase
    .from('teams')
    .insert(cleanTeams)
    .select()

  if (teamsError) throw teamsError
  console.log(`✅ ${insertedTeams.length} times inseridos`)

  const teamApiToDbId = new Map(insertedTeams.map((t: any) => [t.api_id, t.id]))

  // 2. PLAYERS (Paginated - League wide)
  console.log('🏃‍♂️ Buscando Jogadores (Paginado)...')
  let playersToInsert: any[] = []
  let currentPage = 1
  let totalPages = 1

  while (currentPage <= totalPages) {
    console.log(`   Página ${currentPage}...`)
    const playersData = await fetchAPI(`/players?league=${LEAGUE_ID}&season=${SEASON}&page=${currentPage}`)
    const apiPlayers = playersData.response
    totalPages = playersData.paging.total

    for (const item of apiPlayers) {
      const dbTeamId = teamApiToDbId.get(item.statistics[0].team.id)
      if (!dbTeamId) continue

      let position = item.statistics[0].games.position
      let ptPosition = 'Meio-campo'
      if (position === 'Goalkeeper') ptPosition = 'Goleiro'
      else if (position === 'Defender') ptPosition = 'Zagueiro'
      else if (position === 'Attacker') ptPosition = 'Atacante'

      playersToInsert.push({
        name: item.player.name,
        team_id: dbTeamId,
        position: ptPosition,
        price: 10,
        api_id: item.player.id,
        last_atk_score: 0,
        last_def_score: 0
      })
    }

    // Rate limit safety
    if (currentPage < totalPages) await new Promise(r => setTimeout(r, 100))
    currentPage++
    
    // Safety break to not burn all credits accidentally if something goes wrong
    if (currentPage > 50) break 
  }

  const { error: playersError } = await supabase.from('players').insert(playersToInsert)
  if (playersError) throw playersError
  console.log(`✅ ${playersToInsert.length} jogadores inseridos!`)

  // 3. FIXTURES (Matches)
  console.log('📅 Buscando Tabela de Jogos...')
  const fixturesData = await fetchAPI(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`)
  const apiFixtures = fixturesData.response

  const matches = apiFixtures.map((f: any) => ({
    api_id: f.fixture.id,
    home_team_id: teamApiToDbId.get(f.homes.team?.id || f.teams.home.id),
    away_team_id: teamApiToDbId.get(f.aways.team?.id || f.teams.away.id),
    group_letter: 'A',
    stage: 'GROUP_STAGE',
    round_number: parseInt(f.league.round.replace(/[^0-9]/g, '')),
    match_day: 1,
    starts_at: f.fixture.date,
    status: f.fixture.status.short === 'FT' ? 'FINISHED' : (f.fixture.status.short === 'NS' ? 'SCHEDULED' : 'LIVE'),
    home_score_ft: f.goals.home,
    away_score_ft: f.goals.away,
    processed: false
  })).filter((m: any) => m.home_team_id && m.away_team_id)

  const { error: matchesError } = await supabase.from('matches').insert(matches)
  if (matchesError) throw matchesError

  console.log(`✅ ${matches.length} partidas inseridas`)
  console.log('🎉 Migração Completa para Brasileirão 2026 (API-Football)!')
}

seed().catch(console.error)
