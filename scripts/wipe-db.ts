import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function wipe() {
  console.log('🧹 Iniciando Limpeza Profunda do Banco de Dados...')
  
  // 1. Predictions
  console.log('Removendo Palpites (predictions)...')
  await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // 2. Draft Picks
  console.log('Removendo Times Escolhidos (draft)...')
  await supabase.from('draft_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // 3. User Scores and Score Ledger (except initial balance)
  console.log('Resetando Economia e Pontuação (score_ledger, user_scores)...')
  await supabase.from('user_scores').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
  // For score_ledger we delete everything and then just re-add the 10 starting balance.
  await supabase.from('score_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  
  const { data: profiles } = await supabase.from('profiles').select('id')
  if (profiles && profiles.length > 0) {
    const ledgers = profiles.map(p => ({
      user_id: p.id,
      reason: 'STARTING_BALANCE',
      points: 10
    }))
    await supabase.from('score_ledger').insert(ledgers)
    console.log(`✅ Restaurado o saldo de 10 moedas para ${profiles.length} usuários.`)
  }

  // 4. Knockout Phases (If any specific table)
  // In our schema we don't have separate knockout tables recorded right now.

  // 5. Matches, Players, Teams, Craques, MVPs
  console.log('Removendo Partidas, Times e Craques...')
  await supabase.from('mvp_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('round_craques').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('matches').delete().neq('id', 0)
  await supabase.from('players').delete().neq('id', 0)
  await supabase.from('teams').delete().neq('id', 0)

  // Leave App Config and Profiles intact
  console.log('✅ App Config e Usuários preservados.')

  console.log('🎉 Banco de dados limpo com sucesso! Todos os dados de teste foram apagados.')
  console.log('👉 Execute "npm run seed-br" quando quiser povoar a primeira rodada do Brasileirão.')
}

wipe().catch(console.error)
