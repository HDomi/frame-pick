'use client'

import { useEffect, useState } from 'react'

/**
 * 목표 시각까지 남은 ms를 주기적으로 갱신한다.
 * @param {number | null} targetAt - epoch ms
 * @returns {number} - 남은 ms (0 이상)
 */
export function useCountdownTo(targetAt: number | null): number {
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (targetAt == null) {
      setRemainingMs(0)
      return
    }

    /**
     * @returns {void}
     */
    const tick = () => {
      setRemainingMs(Math.max(0, targetAt - Date.now()))
    }

    tick()
    const timer = window.setInterval(tick, 250)
    return () => {
      window.clearInterval(timer)
    }
  }, [targetAt])

  return remainingMs
}

/**
 * 남은 시간을 m:ss 로 포맷한다.
 * @param {number} remainingMs
 * @returns {string}
 */
export function formatCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
