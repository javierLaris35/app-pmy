import { beforeEach, describe, expect, it } from 'vitest'
import { useUnloadingStore } from './unloading.store'
import type { PackageInfoForUnloading } from '@/lib/types'

const pkg = (trackingNumber: string, isValid: boolean): PackageInfoForUnloading =>
  ({ id: trackingNumber, trackingNumber, isValid, priority: 'media' } as PackageInfoForUnloading)

describe('unloading.store setters', () => {
  beforeEach(() => useUnloadingStore.getState().clearAll())

  it('acepta updater funcional sin guardar la función como estado', () => {
    const s = useUnloadingStore.getState()
    s.setShipments([pkg('111111111111', true)])
    s.setShipments((prev) => [...prev, pkg('877220375691', true)])

    const shipments = useUnloadingStore.getState().shipments
    expect(Array.isArray(shipments)).toBe(true)
    expect(shipments.map((p) => p.trackingNumber)).toEqual(['111111111111', '877220375691'])
  })

  it('el alta manual reemplaza la fila inválida y saca la guía de sobrantes', () => {
    const s = useUnloadingStore.getState()
    s.setShipments([pkg('111111111111', true), pkg('877586517413', false)])
    s.setSurplusTrackings(['877586517413'])

    s.setShipments((prev) => [...prev.filter((p) => p.trackingNumber !== '877586517413'), pkg('877586517413', true)])
    s.setSurplusTrackings((prev) => prev.filter((t) => t !== '877586517413'))

    const st = useUnloadingStore.getState()
    expect(st.shipments.filter((p) => p.trackingNumber === '877586517413')).toHaveLength(1)
    expect(st.shipments.every((p) => p.isValid)).toBe(true)
    expect(st.surplusTrackings).toEqual([])
  })

  it('sigue aceptando valor directo', () => {
    useUnloadingStore.getState().setSurplusTrackings(['a', 'b'])
    expect(useUnloadingStore.getState().surplusTrackings).toEqual(['a', 'b'])
  })
})
