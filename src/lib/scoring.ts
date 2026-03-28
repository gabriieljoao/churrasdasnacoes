import type { ScoreReason } from '@/types'

export const SCORE_MAP: Record<ScoreReason, number> = {
  WIN: 3,
  DRAW: 1,
  BLOWOUT: 5,
  ADVANCE_R16: 5,
  ADVANCE_QF: 8,
  ADVANCE_SF: 13,
  ADVANCE_FINAL: 20,
  CHAMPION: 40,
  GOAL: 1,
  CRAQUE_GOAL: 2,
  PREDICTION_WINNER: 2,
  PREDICTION_EXACT: 5,
  MVP_BONUS: 3,
  BRACKET_R16: 3,
  BRACKET_QF: 5,
  BRACKET_SF: 8,
  BRACKET_CHAMPION: 15,
}

export const SCORE_LABELS: Record<string, string> = {
  WIN: 'Vitória na fase de grupos',
  DRAW: 'Empate na fase de grupos',
  BLOWOUT: 'Goleada (3+ gols de diferença)',
  ADVANCE_R16: 'Classificou para as oitavas',
  ADVANCE_QF: 'Classificou para as quartas',
  ADVANCE_SF: 'Classificou para a semifinal',
  ADVANCE_FINAL: 'Classificou para a final',
  CHAMPION: 'Campeão!',
  GOAL: 'Gol do time',
  CRAQUE_GOAL: 'Gol do Craque Contratado',
  PREDICTION_WINNER: 'Palpite: acertou o vencedor',
  PREDICTION_EXACT: 'Palpite: acertou o placar exato',
  MVP_BONUS: 'MVP da Rodada',
  BRACKET_R16: 'Mata-mata: oitava acertada',
  BRACKET_QF: 'Mata-mata: quarta acertada',
  BRACKET_SF: 'Mata-mata: semifinal acertada',
  BRACKET_CHAMPION: 'Mata-mata: campeão acertado',
  STARTING_BALANCE: 'Saldo Inicial (Bankroll)',
  BUY_CRAQUE: 'Compra de Jogador na Bolsa',
  REFUND_CRAQUE: 'Reembolso de Jogador na Bolsa',
}

export const SCORE_DESCRIPTIONS: Record<string, string> = {
  WIN: 'Quando uma das Seleções do seu Draft vence uma partida na fase de grupos.',
  DRAW: 'Quando uma das Seleções do seu Draft empata uma partida na fase de grupos.',
  BLOWOUT: 'Quando uma das Seleções do seu Draft ganha com uma margem de 3 ou mais gols (ex: 3x0, 4x1).',
  ADVANCE_R16: 'Sua Seleção passou da Fase de Grupos para as Oitavas de Final.',
  ADVANCE_QF: 'Sua Seleção passou das Oitavas para as Quartas de Final.',
  ADVANCE_SF: 'Sua Seleção passou das Quartas para a Semifinal.',
  ADVANCE_FINAL: 'Sua Seleção passou da Semifinal para a Grande Final.',
  CHAMPION: 'A Seleção do seu Draft foi Campeã da Copa do Mundo!',
  GOAL: 'Qualquer gol marcado pelas Seleções do seu Draft em qualquer partida.',
  CRAQUE_GOAL: 'Cada gol mercado pelo jogador que você escalou como seu Craque da Rodada na aba de Draft.',
  PREDICTION_WINNER: 'No Chutômetro, você acertou qual time ganharia (ou que daria empate), mas errou o placar numérico.',
  PREDICTION_EXACT: 'No Chutômetro, você cravou perfeitamente o placar exato da partida!',
  MVP_BONUS: 'Bônus dado ao jogador que mais fez pontos sozinho no Ranking durante uma única Rodada.',
  BRACKET_R16: 'No seu Mata-mata da Copa, você acertou perfeitamente que esta Seleção chegaria às Oitavas.',
  BRACKET_QF: 'No seu Mata-mata da Copa, você acertou perfeitamente que esta Seleção chegaria às Quartas.',
  BRACKET_SF: 'No seu Mata-mata da Copa, você acertou perfeitamente que esta Seleção chegaria à Semifinal.',
  BRACKET_CHAMPION: 'Você acertou o Grande Campeão no seu Mata-mata!',
  STARTING_BALANCE: 'Saldo Mágico inicial que todo jogador recebe no começo da Copa.',
  BUY_CRAQUE: 'Ponto debitado do seu Ranking e Saldo para pagar a "contratação" temporária do Craque.',
  REFUND_CRAQUE: 'Crédito devolvido para a sua conta porque você cancelou a escalação de um Craque.',
}

/** Max teams a single player can draft */
export const DRAFT_MAX_TEAMS = 3

/** Max players who can share the same team */
export const DRAFT_MAX_SHARED = 2

/** Hours before first round match to lock craque selection */
export const CRAQUE_DEADLINE_HOURS = 6

/** Minimum goal diff for a blowout bonus */
export const BLOWOUT_GOAL_DIFF = 3

/** BBQ positions */
export const BBQ_RULES = [
  {
    rank: 1,
    privilege: 'Escolhe 1 corte de carne',
    obligation: 'Não paga nada',
    lights_charcoal: false,
    badge: '👑',
  },
  {
    rank: 2,
    privilege: 'Escolhe 1 corte de carne',
    obligation: 'Racha o custo com todos (exceto 1º)',
    lights_charcoal: false,
    badge: '🥈',
  },
  {
    rank: 3,
    privilege: 'Escolhe 1 corte de carne',
    obligation: 'Racha o custo com todos (exceto 1º)',
    lights_charcoal: false,
    badge: '🥉',
  },
  {
    rank: 4,
    privilege: 'Decide os acompanhamentos com o grupo',
    obligation: 'Racha o custo entre si, com o 2º e 3º',
    lights_charcoal: false,
    badge: null,
  },
] as const

export function getBBQRuleForRank(rank: number) {
  if (rank <= 3) return BBQ_RULES[rank - 1]
  return {
    rank,
    privilege: 'Decide os acompanhamentos com o grupo',
    obligation: `Racha o custo${rank === undefined ? '' : ' + acende o carvão'}`,
    lights_charcoal: false,
    badge: null,
  }
}

export function getBBQObligationForRank(rank: number, isLast: boolean): string {
  if (rank === 1) return 'Não paga nada'
  if (rank <= 3) return 'Racha o custo com todos (exceto 1º)'
  if (isLast) return 'Racha o custo + acende o carvão'
  return 'Racha o custo entre si, com o 2º e 3º'
}
