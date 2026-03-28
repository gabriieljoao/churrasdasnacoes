import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

// Load environment variables from .env
dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // We need the service role key to bypass RLS!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  console.log('You need the SERVICE ROLE KEY (not the anon key) to seed the database bypassing RLS.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const TEAMS = [
  { name: 'Brasil', code: 'br', group: 'A' },
  { name: 'Argentina', code: 'ar', group: 'A' },
  { name: 'França', code: 'fr', group: 'A' },
  { name: 'Inglaterra', code: 'gb-eng', group: 'A' },
  
  { name: 'Espanha', code: 'es', group: 'B' },
  { name: 'Portugal', code: 'pt', group: 'B' },
  { name: 'Alemanha', code: 'de', group: 'B' },
  { name: 'Holanda', code: 'nl', group: 'B' },
  
  { name: 'Itália', code: 'it', group: 'C' },
  { name: 'Uruguai', code: 'uy', group: 'C' },
  { name: 'Colômbia', code: 'co', group: 'C' },
  { name: 'Bélgica', code: 'be', group: 'C' },
  
  { name: 'Croácia', code: 'hr', group: 'D' },
  { name: 'Marrocos', code: 'ma', group: 'D' },
  { name: 'Japão', code: 'jp', group: 'D' },
  { name: 'EUA', code: 'us', group: 'D' },
]

async function seed() {
  console.log('🌱 Seeding database...')

  // 1. Clear old data to prevent duplicates (since no unique constraint exists on name)
  await supabase.from('round_craques').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('score_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', 0)
  await supabase.from('players').delete().neq('id', 0)
  await supabase.from('teams').delete().neq('id', 0)
  console.log('✅ Old data cleared')

  // 1.5 Restore 10 coins starting balance for existing profiles
  const { data: profiles } = await supabase.from('profiles').select('id')
  if (profiles && profiles.length > 0) {
    const ledgers = profiles.map(p => ({
      user_id: p.id,
      reason: 'STARTING_BALANCE',
      points: 10
    }))
    await supabase.from('score_ledger').insert(ledgers)
    console.log(`✅ Restored 10 coins balance to ${profiles.length} profiles`)
  }

  // 2. App Config
  await supabase.from('app_config').upsert({ id: true, phase: 'PRE_COPA', draft_open: true })
  console.log('✅ App config set to PRE_COPA')

  // 2. Teams
  console.log('Inserting teams...')
  const cleanTeams = TEAMS.map(t => ({
    name: t.name,
    country_code: t.code,
    group_letter: t.group,
    flag_url: `https://flagcdn.com/w80/${t.code}.png`
  }))

  const { data: insertedTeams, error: teamsError } = await supabase
    .from('teams')
    .insert(cleanTeams)
    .select()

  if (teamsError) throw teamsError
  console.log(`✅ ${insertedTeams.length} teams inserted`)

  // 3. Fake Players (Cartola-style base economy: everyone starts at 10)
  console.log('Inserting fake players with base pricing of 10...')
  const PLAYERS: any[] = []
  insertedTeams.forEach(team => {
    PLAYERS.push({ name: `Atacante do ${team.name}`, team_id: team.id, position: 'Atacante', price: 10 })
    PLAYERS.push({ name: `Meia do ${team.name}`, team_id: team.id, position: 'Meio-campo', price: 10 })
    PLAYERS.push({ name: `Zagueiro do ${team.name}`, team_id: team.id, position: 'Zagueiro', price: 10 })
  })

  const { error: playersError } = await supabase.from('players').insert(PLAYERS)
  if (playersError) throw playersError
  console.log('✅ Players inserted')

  // 4. Fake Matches (Round 1)
  console.log('Inserting Round 1 matches...')
  const matchDate = new Date()
  matchDate.setDate(matchDate.getDate() + 2) // Match strictly in 2 days from now

  const matches = [
    { home_team_id: insertedTeams[0].id, away_team_id: insertedTeams[1].id, group_letter: 'A', stage: 'GROUP_STAGE', round_number: 1, match_day: 1, starts_at: matchDate.toISOString() },
    { home_team_id: insertedTeams[2].id, away_team_id: insertedTeams[3].id, group_letter: 'A', stage: 'GROUP_STAGE', round_number: 1, match_day: 1, starts_at: matchDate.toISOString() },
    { home_team_id: insertedTeams[4].id, away_team_id: insertedTeams[5].id, group_letter: 'B', stage: 'GROUP_STAGE', round_number: 1, match_day: 2, starts_at: matchDate.toISOString() },
  ]

  const { error: matchesError } = await supabase.from('matches').insert(matches)
  if (matchesError) throw matchesError
  console.log('✅ Matches inserted')

  console.log('🎉 Database fully seeded! You can now test the draft and predictions.')
}

seed().catch(console.error)
