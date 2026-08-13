import { describe, it, expect } from 'vitest';
import {
  classifyClosureBucket,
  packageBlocksClosure,
  isClosureBlockedByOtherStatus,
} from './closure-status';

describe('classifyClosureBucket', () => {
  it('clasifica entregado como delivered', () => {
    expect(classifyClosureBucket('entregado')).toBe('delivered');
  });

  it('clasifica los DEX/devolucion como not_delivered', () => {
    expect(classifyClosureBucket('no_entregado')).toBe('not_delivered');
    expect(classifyClosureBucket('rechazado')).toBe('not_delivered');
    expect(classifyClosureBucket('devuelto_a_fedex')).toBe('not_delivered');
  });

  // Regla del bug SUP-0008: los ocurres (y entregas en bodega) son terminales y NO
  // deben caer en "Otros Estatus" ni bloquear el cierre de ruta.
  it('clasifica es_ocurre como ocurre (resuelto), no como other', () => {
    expect(classifyClosureBucket('es_ocurre')).toBe('ocurre');
  });

  it('clasifica entregado_en_bodega como ocurre (resuelto)', () => {
    expect(classifyClosureBucket('entregado_en_bodega')).toBe('ocurre');
  });

  it('es insensible a mayúsculas', () => {
    expect(classifyClosureBucket('ES_OCURRE')).toBe('ocurre');
  });

  // Los paquetes "No VAN" pueden traer el estatus normalizado en inglés desde FedEx.
  it('trata "delivered"/"Entregado" (No VAN) como delivered', () => {
    expect(classifyClosureBucket('delivered')).toBe('delivered');
    expect(classifyClosureBucket('Entregado')).toBe('delivered');
  });

  it('deja los estatus sin resolver (pendiente/en_ruta) como other', () => {
    expect(classifyClosureBucket('pendiente')).toBe('other');
    expect(classifyClosureBucket('en_ruta')).toBe('other');
    expect(classifyClosureBucket(undefined)).toBe('other');
  });
});

describe('packageBlocksClosure', () => {
  it('un ocurre con fecha de hoy NO bloquea el cierre', () => {
    expect(packageBlocksClosure('es_ocurre')).toBe(false);
  });

  it('un pendiente sin resolver sí es candidato a bloquear (queda en other)', () => {
    expect(packageBlocksClosure('pendiente')).toBe(true);
  });

  it('entregados y no entregados no quedan en other', () => {
    expect(packageBlocksClosure('entregado')).toBe(false);
    expect(packageBlocksClosure('no_entregado')).toBe(false);
  });
});

describe('isClosureBlockedByOtherStatus', () => {
  it('bloquea cuando hay otros estatus venciendo hoy y la sucursal NO tiene la excepción', () => {
    expect(isClosureBlockedByOtherStatus(true, false)).toBe(true);
    expect(isClosureBlockedByOtherStatus(true, undefined)).toBe(true);
  });

  // Config Hermosillo: permitir cerrar aunque haya paquetes en "otros estatus".
  it('NO bloquea cuando la sucursal tiene la excepción activada', () => {
    expect(isClosureBlockedByOtherStatus(true, true)).toBe(false);
  });

  it('nunca bloquea si no hay otros estatus venciendo hoy', () => {
    expect(isClosureBlockedByOtherStatus(false, false)).toBe(false);
    expect(isClosureBlockedByOtherStatus(false, true)).toBe(false);
  });
});
