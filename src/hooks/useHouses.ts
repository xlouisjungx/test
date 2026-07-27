import { useEffect, useState } from 'react'
import { getHouseById, getHouses } from '../repositories/houseRepository'
import type { House } from '../types'

export function useHouses() {
  const [houses, setHouses] = useState<House[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getHouses().then((data) => {
      if (!cancelled) {
        setHouses(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { houses, loading }
}

export function useHouse(id: string | undefined) {
  const [house, setHouse] = useState<House | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setHouse(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getHouseById(id).then((data) => {
      if (!cancelled) {
        setHouse(data)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  return { house, loading }
}
