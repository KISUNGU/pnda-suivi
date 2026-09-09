// frontend/src/services/offlineDb.service.ts
import Dexie from 'dexie';

export interface FormData {
  id?: number;
  formId: string;
  formName: string;
  data: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  photos: string[];
  synced: boolean;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  province?: string;
}

export interface SyncLog {
  id?: number;
  syncDate: Date;
  syncedCount: number;
  failedCount: number;
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export type CollecteFormData = FormData;

class OfflineDatabase extends Dexie {
  formsData: Dexie.Table<FormData, number>;
  syncLogs: Dexie.Table<SyncLog, number>;

  constructor() {
    super('PNDA_OfflineDB');
    
    this.version(1).stores({
      formsData: '++id, formId, synced, createdAt, province, userId',
      syncLogs: '++id, syncDate, status',
    });

    // v2: remove boolean 'synced' index — IndexedDB doesn't support boolean keys
    this.version(2).stores({
      formsData: '++id, formId, createdAt, province, userId',
      syncLogs: '++id, syncDate, status',
    });
    
    this.formsData = this.table('formsData');
    this.syncLogs = this.table('syncLogs');
  }
}

export const db = new OfflineDatabase();

export class OfflineDataService {
  
  async saveFormData(
    formId: string,
    formName: string,
    data: Record<string, unknown>,
    photos: string[] = [],
    province?: string
  ): Promise<number> {
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (error) {
        console.warn('Geolocation not available:', error);
      }
    }
    
    const userId = localStorage.getItem('userId') || 'unknown';
    
    const id = await db.formsData.add({
      formId,
      formName,
      data,
      latitude,
      longitude,
      photos,
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      province,
    });
    
    return id;
  }
  
  async getUnsyncedForms(): Promise<FormData[]> {
    return db.formsData.filter(f => !f.synced).toArray();
  }
  
  async getAllForms(): Promise<FormData[]> {
    return db.formsData.orderBy('createdAt').reverse().toArray();
  }
  
  async markAsSynced(id: number): Promise<void> {
    await db.formsData.update(id, { 
      synced: true, 
      syncedAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  async deleteForm(id: number): Promise<void> {
    await db.formsData.delete(id);
  }
  
  async countUnsynced(): Promise<number> {
    return db.formsData.filter(f => !f.synced).count();
  }
  
  async syncWithServer(): Promise<{ synced: number; failed: number; errors: unknown[] }> {
    const unsynced = await this.getUnsyncedForms();
    let synced = 0;
    let failed = 0;
    const errors: unknown[] = [];
    
    for (const form of unsynced) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/collecte/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            formId: form.formId,
            formName: form.formName,
            data: form.data,
            location: { lat: form.latitude, lng: form.longitude },
            photos: form.photos,
            collectedAt: form.createdAt,
          }),
        });
        
        if (response.ok) {
          await this.markAsSynced(form.id!);
          synced++;
        } else {
          failed++;
          errors.push({ id: form.id, status: response.status });
        }
      } catch (error) {
        failed++;
        errors.push({ id: form.id, error });
      }
    }
    
    await db.syncLogs.add({
      syncDate: new Date(),
      syncedCount: synced,
      failedCount: failed,
      status: failed === 0 ? 'success' : synced > 0 ? 'partial' : 'failed',
    });
    
    return { synced, failed, errors };
  }
  
  async getSyncHistory(): Promise<SyncLog[]> {
    return db.syncLogs.orderBy('syncDate').reverse().limit(20).toArray();
  }
  
  async clearAllData(): Promise<void> {
    await db.formsData.clear();
    await db.syncLogs.clear();
  }
}

export const offlineService = new OfflineDataService();
export default offlineService;