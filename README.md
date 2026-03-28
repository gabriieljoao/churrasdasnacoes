# ⚽ ChurrAsco das Nações - Brasileirão 2026

Plataforma de Draft e Chutômetro automatizada para o Brasileirão Série A 2026. O sistema integra dados reais via API em tempo real e processa pontuações automaticamente através do GitHub Actions.

## ✨ Funcionalidades

- **Chutômetro (Palpites)**: Registre placares para todos os jogos da rodada e ganhe pontos por acerto exato ou vencedor.
- **Draft de Seleções**: Escolha 3 clubes para torcer. Você ganha pontos por vitórias, empates, goleadas e gols marcados por esses times.
- **Craque da Rodada**: Escolha um jogador do Brasileirão para ser seu trunfo. Gols e cartões do jogador influenciam seu balanço de moedas.
- **Ranking em Tempo Real**: Acompanhe sua posição no grupo e veja quem é o MVP da rodada anterior.
- **Sincronismo Automático**: Resultados e eventos (gols/cartões) são sincronizados a cada 5 minutos via GitHub Actions.

## 🚀 Tecnologias

- **Frontend**: React (Vite), TypeScript, Lucide React, Supabase Auth.
- **Backend/DB**: Supabase (PostgreSQL + Realtime).
- **Automação**: GitHub Actions (Node.js + TSX).
- **Dados**: API Football-Data.org.

## ⚙️ Configuração (Deploy)

Este projeto foi desenhado para rodar no **GitHub Pages** e usar **GitHub Actions** para o backend.

### 1. Requisitos
- Conta no [Supabase](https://supabase.com/) com as tabelas configuradas.
- Chave de API do [Football-Data.org](https://www.football-data.org/).

### 2. Secrets do GitHub
No seu repositório do GitHub, vá em `Settings > Secrets and variables > Actions` e adicione as seguintes chaves:
- `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
- `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (Service Role) para scripts de automação.
- `FOOTBALL_DATA_API_KEY`: Sua chave da API Football-Data.

### 3. Scripts de Manutenção (Actions)
Os workflows automáticos estão localizados em `.github/workflows/`:
- `sync-brasileirao.yml`: Roda o sincronismo de resultados e cálculo de pontos.

## 🛠️ Desenvolvimento Local

1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente em um arquivo `.env` (não versionado).
3. Inicie o servidor: `npm run dev`

---
*Projeto desenvolvido como parte da iniciativa ChurrAsco das Nações.*
