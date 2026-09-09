/**
 * Types partages par les routers HTTP.
 */
import type { RowDataPacket } from '../db/types';

/** Resultat d'un SELECT COUNT(*) AS total. */
export interface CountRow extends RowDataPacket {
  total: number;
}

export interface AlerteRisque {
  id: number;
  id_risque: number;
  message: string;
  date_alerte: string;
  est_lue: boolean;
  niveau: 'info' | 'warning' | 'danger';
}
