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

  console.log('\n📋 LISTA COMPLETA DE LIGAS NO BRASIL:')
  for (const item of leagues) {
    const l = item.league
    console.log(`- [ID: ${l.id}] ${l.name}`)
    
    // Se parecer com Brasileirão, vamos dar mais detalhes
    if (l.name.toLowerCase().includes('serie a') || l.name.toLowerCase().includes('brasileir') || l.id === 71) {
      console.log(`   ✨ ESTA PARECE INTERESSANTE!`)
      console.log(`   ⭐ Temporadas:`, item.seasons.map((s: any) => `${s.year}${s.current ? ' (ATUAL)' : ''}`).join(', '))
    }
  }

  console.log('\n🏁 Scanner concluído.')
}

scan().catch(console.error)
