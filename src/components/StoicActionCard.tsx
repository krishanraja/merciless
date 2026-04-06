interface StoicAction {
  action: string
  why: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface StoicActionCardProps {
  actions: StoicAction[]
}

const difficultyConfig = {
  easy: { label: 'DO NOW', color: 'text-green-400', border: 'border-green-400/30' },
  medium: { label: 'REQUIRES EFFORT', color: 'text-merciless-gold', border: 'border-merciless-gold/30' },
  hard: { label: 'HARD TRUTH', color: 'text-red-400', border: 'border-red-400/30' },
}

export default function StoicActionCard({ actions }: StoicActionCardProps) {
  return (
    <div className="space-y-3">
      {actions.map((action, i) => {
        const config = difficultyConfig[action.difficulty] || difficultyConfig.medium
        return (
          <div
            key={i}
            className={`bg-merciless-card border ${config.border} rounded-lg p-4 space-y-2`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-widest text-merciless-muted">
                ACTION {i + 1}
              </span>
              <span className={`text-xs font-bold tracking-widest ${config.color}`}>
                {config.label}
              </span>
            </div>
            <p className="text-merciless-white font-medium leading-snug">{action.action}</p>
            <p className="text-merciless-muted text-sm leading-relaxed">{action.why}</p>
          </div>
        )
      })}
    </div>
  )
}
