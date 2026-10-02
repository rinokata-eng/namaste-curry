'use client'

import { useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  char: string
  size: number
}

export function AnimatedLikeButton({
  likesCount,
  isLiked,
  onClick,
}: {
  likesCount: number
  isLiked: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const [animating, setAnimating] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [showRing, setShowRing] = useState(false)

  const triggerParticles = (e: React.MouseEvent) => {
    setAnimating(true)
    setShowRing(true)
    setTimeout(() => setAnimating(false), 500)
    setTimeout(() => setShowRing(false), 600)

    const newParticles: Particle[] = []
    const chars = ['❤️', '💖', '✨', '🔥', '🎉', '🌟', '💥', '💓', '⚡']

    // 16個の特大飛散パーティクルを生成
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * 360 + (Math.random() * 20 - 10)
      const radius = 60 + Math.random() * 50
      const rad = (angle * Math.PI) / 180
      const x = Math.cos(rad) * radius
      const y = Math.sin(rad) * radius
      const char = chars[Math.floor(Math.random() * chars.length)]
      const size = 14 + Math.random() * 12

      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        char,
        size,
      })
    }

    setParticles(newParticles)
    setTimeout(() => setParticles([]), 750)

    onClick(e)
  }

  return (
    <div className="relative inline-block overflow-visible">
      {/* 拡散オーラリング */}
      {showRing && (
        <span className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full border-pink-500 pointer-events-none z-20 animate-ring" />
      )}

      {/* 飛び出す特大パーティクル群 */}
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 pointer-events-none z-30 animate-super-particle font-black drop-shadow-md select-none"
          style={{
            fontSize: `${p.size}px`,
            '--tw-translate-x': `${p.x}px`,
            '--tw-translate-y': `${p.y}px`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}

      <button
        onClick={triggerParticles}
        className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-200 border shadow-md flex items-center gap-1.5 active:scale-90 ${
          animating ? 'animate-super-pop shadow-pink-400/50 shadow-lg' : ''
        } ${
          isLiked
            ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 text-white border-pink-300 shadow-pink-300/80 ring-2 ring-pink-300'
            : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
        }`}
      >
        <span className={`transition-transform duration-300 ${isLiked ? 'scale-150 rotate-[-12deg]' : ''}`}>
          ❤️
        </span>
        <span className="tracking-wide">{likesCount}</span>
      </button>
    </div>
  )
}

export function AnimatedBookmarkButton({
  isBookmarked,
  onClick,
}: {
  isBookmarked: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const [animating, setAnimating] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [showRing, setShowRing] = useState(false)

  const triggerParticles = (e: React.MouseEvent) => {
    setAnimating(true)
    setShowRing(true)
    setTimeout(() => setAnimating(false), 500)
    setTimeout(() => setShowRing(false), 600)

    const newParticles: Particle[] = []
    const chars = ['⭐', '🌟', '✨', '💫', '💛', '👑', '🌈', '🎉']

    // 16個の特大飛散パーティクルを生成
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * 360 + (Math.random() * 20 - 10)
      const radius = 60 + Math.random() * 50
      const rad = (angle * Math.PI) / 180
      const x = Math.cos(rad) * radius
      const y = Math.sin(rad) * radius
      const char = chars[Math.floor(Math.random() * chars.length)]
      const size = 14 + Math.random() * 12

      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        char,
        size,
      })
    }

    setParticles(newParticles)
    setTimeout(() => setParticles([]), 750)

    onClick(e)
  }

  return (
    <div className="relative inline-block overflow-visible">
      {/* 拡散オーラリング */}
      {showRing && (
        <span className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full border-amber-400 pointer-events-none z-20 animate-ring" />
      )}

      {/* 飛び出す特大パーティクル群 */}
      {particles.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 pointer-events-none z-30 animate-super-particle font-black drop-shadow-md select-none"
          style={{
            fontSize: `${p.size}px`,
            '--tw-translate-x': `${p.x}px`,
            '--tw-translate-y': `${p.y}px`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}

      <button
        onClick={triggerParticles}
        className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-200 border shadow-md flex items-center gap-1.5 active:scale-90 ${
          animating ? 'animate-super-pop shadow-amber-400/50 shadow-lg' : ''
        } ${
          isBookmarked
            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-amber-200 shadow-amber-300/80 ring-2 ring-yellow-300'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
        }`}
      >
        <span className={`transition-transform duration-300 ${isBookmarked ? 'scale-150 rotate-[20deg]' : ''}`}>
          ⭐
        </span>
        <span className="tracking-wide">{isBookmarked ? '保存済み' : '保存'}</span>
      </button>
    </div>
  )
}
