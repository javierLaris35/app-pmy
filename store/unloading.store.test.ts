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

  it('cada sucursal tiene su propia captura', () => {
    const s = useUnloadingStore.getState()
    s.activateSubsidiary('A', 'A')
    s.setShipments([pkg('111111111111', true)])
    useUnloadingStore.getState().activateSubsidiary('B', 'A')
    expect(useUnloadingStore.getState().shipments).toEqual([])
    expect(useUnloadingStore.getState().subsidiaryId).toBe('B')
    useUnloadingStore.getState().activateSubsidiary('A', 'A')
    expect(useUnloadingStore.getState().shipments.map((p) => p.trackingNumber)).toEqual(['111111111111'])
  })

  it('cada captura tiene su folio: se conserva por sucursal y cambia al limpiar', () => {
    const s = useUnloadingStore.getState()
    s.activateSubsidiary('F1', 'F1')
    s.setShipments([pkg('111111111111', true)])
    const folio = useUnloadingStore.getState().clientRequestId
    expect(folio).toBeTruthy()
    useUnloadingStore.getState().activateSubsidiary('F2', 'F1')
    expect(useUnloadingStore.getState().clientRequestId).not.toBe(folio)
    useUnloadingStore.getState().activateSubsidiary('F1', 'F1')
    expect(useUnloadingStore.getState().clientRequestId).toBe(folio)
    useUnloadingStore.getState().clearAll()
    expect(useUnloadingStore.getState().clientRequestId).not.toBe(folio)
  })

  it('sigue aceptando valor directo', () => {
    useUnloadingStore.getState().setSurplusTrackings(['a', 'b'])
    expect(useUnloadingStore.getState().surplusTrackings).toEqual(['a', 'b'])
  })
})
