import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env') })

const apiKey = process.env.API_FOOTBALL_KEY
const API_URL = 'https://v3.football.api-sports.io'

if (!apiKey) {
  console.error('❌ Falta a variável: API_FOOTBALL_KEY')
  process.exit(1)
}

async function scan() {
  console.log('🔍 Iniciando Scanner de API (Localizando Brasileirão)...')
  
  const headers = { 
    'x-apisports-key': apiKey!,
    'x-rapidapi-key': apiKey!
  }

  // 1. Procurar pela liga "Brazil"
  console.log('📡 Buscando todas as ligas do Brasil...')
  const res = await fetch(`${API_URL}/leagues?country=Brazil`, { headers })
  const data = await res.json()

  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('❌ Erro na API:', data.errors)
    return
  }

  const leagues = data.response || []
  console.log(`✅ Foram encontradas ${leagues.length} ligas no Brasil.`)

  for (const item of leagues) {
    const l = item.league
    if (l.name.includes('Série A') || l.name === 'League 71') {
      console.log(`\n🏆 LIGA ENCONTRADA: ${l.name} (ID: ${l.id})`)
      console.log(`⭐ Temporadas Disponíveis:`, item.seasons.map((s: any) => `${s.year} (Atual: ${s.current})`).join(', '))
      
      // Testar 2026 especificamente
      const has2026 = item.seasons.find((s: any) => s.year === 2026)
      if (has2026) {
        console.log(`✅ Temporada 2026 EXISTE para essa liga.`)
        
        // Testar se tem times em 2026
        console.log(`🧪 Testando busca de times para League ${l.id} / Season 2026...`)
        const tRes = await fetch(`${API_URL}/teams?league=${l.id}&season=2026`, { headers })
        const tData = await tRes.json()
        console.log(`📊 Resultado: ${tData.results} times encontrados.`)
      } else {
        console.log(`❌ Temporada 2026 NÃO encontrada para essa liga específica.`)
      }
    }
  }

  console.log('\n🏁 Scanner concluído.')
}

scan().catch(console.error)
