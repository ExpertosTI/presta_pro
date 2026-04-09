/**
 * ConflictResolver — Resolución de conflictos de sincronización
 *
 * Estrategia: Last-Write-Wins (LWW) basado en `updated_at` timestamp.
 *
 * Casos de conflicto:
 *  1. Mismo cobro registrado en dos dispositivos offline → gana el primero
 *     que llega al servidor (el servidor rechaza el segundo con 409, 
 *     el cliente recibe SERVER_WINS y marca la cuota como ya cobrada)
 *  2. Datos del cliente editados en dos dispositivos → merge por campo,
 *     campos individuales con timestamp más reciente ganan
 *  3. Préstamo modificado localmente mientras servidor lo actualizó →
 *     LWW: el timestamp más reciente gana
 *
 * El resolver NO modifica nada en BD directamente. Devuelve la decisión
 * y es responsabilidad del llamador aplicarla.
 */

export const RESOLUTION = Object.freeze({
  LOCAL_WINS:    'LOCAL_WINS',    // Mantener cambio local
  SERVER_WINS:   'SERVER_WINS',   // Descartar local, adoptar versión servidor
  MERGED:        'MERGED',        // Objeto fusionado (merge por campo)
  ALREADY_DONE:  'ALREADY_DONE',  // El servidor ya tenía este cambio (idempotente)
  MANUAL_NEEDED: 'MANUAL_NEEDED', // Conflicto que requiere intervención humana
});

class ConflictResolver {
  /**
   * Resuelve un conflicto entre la versión local y la del servidor.
   *
   * @param {object} params
   * @param {string}  params.entity     - 'receipt' | 'loan' | 'client' | etc.
   * @param {object}  params.localItem  - Versión local (del sync_queue payload)
   * @param {object}  params.serverItem - Versión del servidor (del pull response)
   * @param {string}  params.operation  - 'CREATE' | 'UPDATE' | 'DELETE'
   * @returns {{ resolution: string, winner: object|null, conflicts: string[] }}
   */
  resolve({ entity, localItem, serverItem, operation: _operation }) {
    // Si el servidor dice "ya procesado" (mismo UUID) → idempotente
    if (serverItem?.already_processed) {
      return { resolution: RESOLUTION.ALREADY_DONE, winner: serverItem, conflicts: [] };
    }

    // Si no hay versión en servidor, el local gana (es nuevo)
    if (!serverItem) {
      return { resolution: RESOLUTION.LOCAL_WINS, winner: localItem, conflicts: [] };
    }

    // Para cobros: NUNCA mergear, gana el primero que llegó al servidor
    if (entity === 'receipt') {
      return this._resolveReceipt({ localItem, serverItem });
    }

    // Para clientes: merge campo a campo
    if (entity === 'client') {
      return this._mergeByField({ localItem, serverItem });
    }

    // Para préstamos: LWW por timestamp
    if (entity === 'loan') {
      return this._resolveByTimestamp({ localItem, serverItem });
    }

    // Default: LWW
    return this._resolveByTimestamp({ localItem, serverItem });
  }

  /**
   * Procesa la respuesta de un batch del servidor y devuelve
   * el array de resoluciones para cada item.
   *
   * @param {object[]} queueItems  - Items de sync_queue enviados
   * @param {object}   serverResp  - Respuesta del servidor { results: [...] }
   * @returns {object[]} Array de { queueId, resolution, winner, error }
   */
  processBatchResponse(queueItems, serverResp) {
    const results = serverResp?.results ?? [];
    const resultMap = new Map(results.map((r) => [r.id, r]));

    return queueItems.map((item) => {
      const serverResult = resultMap.get(item.id);

      if (!serverResult) {
        return {
          queueId: item.id,
          resolution: RESOLUTION.MANUAL_NEEDED,
          winner: null,
          error: 'No se recibió resultado del servidor para este item',
        };
      }

      if (serverResult.status === 'ok' || serverResult.status === 'created') {
        return {
          queueId: item.id,
          resolution: RESOLUTION.LOCAL_WINS,
          winner: JSON.parse(item.payload),
          error: null,
        };
      }

      if (serverResult.status === 'already_processed') {
        return {
          queueId: item.id,
          resolution: RESOLUTION.ALREADY_DONE,
          winner: serverResult.server_data || JSON.parse(item.payload),
          error: null,
        };
      }

      if (serverResult.status === 'conflict') {
        const localPayload = JSON.parse(item.payload);
        const resolution = this.resolve({
          entity: item.entity,
          localItem: localPayload,
          serverItem: serverResult.server_data,
          operation: item.operation,
        });
        return {
          queueId: item.id,
          resolution: resolution.resolution,
          winner: resolution.winner,
          error: null,
          conflicts: resolution.conflicts,
        };
      }

      return {
        queueId: item.id,
        resolution: RESOLUTION.MANUAL_NEEDED,
        winner: null,
        error: serverResult.error || 'Error desconocido del servidor',
      };
    });
  }

  // ── Resoluciones específicas por entidad ─────────────────────────────────

  _resolveReceipt({ localItem, serverItem }) {
    // Si el servidor tiene este cobro (mismo installment_id + loan_id), 
    // el servidor gana (el primero que llegó fue aceptado)
    if (
      serverItem.loan_id === localItem.loan_id &&
      serverItem.installment_id === localItem.installment_id
    ) {
      return {
        resolution: RESOLUTION.SERVER_WINS,
        winner: serverItem,
        conflicts: ['Cuota ya cobrada en otro dispositivo. Se mantiene el cobro existente.'],
      };
    }
    return { resolution: RESOLUTION.LOCAL_WINS, winner: localItem, conflicts: [] };
  }

  _mergeByField({ localItem, serverItem }) {
    const conflicts = [];
    const merged = { ...serverItem };

    // Recorrer campos del local; si local es más reciente campo a campo, gana
    for (const [key, localVal] of Object.entries(localItem)) {
      if (key === 'updated_at' || key === 'created_at' || key === 'id') continue;

      const serverVal = serverItem[key];
      if (localVal === serverVal) continue; // sin conflicto

      // Comparar por timestamp del propio campo si existe,
      // sino usar updated_at del objeto completo
      const localTs = localItem.updated_at || localItem.created_at || '0';
      const serverTs = serverItem.updated_at || serverItem.created_at || '0';

      if (localTs >= serverTs) {
        merged[key] = localVal;
      } else {
        conflicts.push(`Campo '${key}': servidor gana (${serverTs} > ${localTs})`);
      }
    }

    merged.updated_at = new Date().toISOString();

    return {
      resolution: RESOLUTION.MERGED,
      winner: merged,
      conflicts,
    };
  }

  _resolveByTimestamp({ localItem, serverItem }) {
    const localTs  = localItem.updated_at  || localItem.created_at  || '0';
    const serverTs = serverItem.updated_at || serverItem.created_at || '0';

    if (localTs >= serverTs) {
      return { resolution: RESOLUTION.LOCAL_WINS,  winner: localItem,  conflicts: [] };
    }
    return {
      resolution: RESOLUTION.SERVER_WINS,
      winner: serverItem,
      conflicts: [`Server version más reciente (${serverTs} > ${localTs})`],
    };
  }
}

export const conflictResolver = new ConflictResolver();
export default conflictResolver;
