// ============================================================
// Adapter — Supabase Room Repository
// ============================================================

import { IRoomRepository } from '../../core/interfaces/IRoomRepository.js';
import { supabase } from '../../infrastructure/database/supabase-client.js';

export class SupabaseRoomRepository extends IRoomRepository {
  /**
   * Fetches all rooms matching criteria.
   * @param {Object} filters - Optional filters { type, city, status, priceRange, sortBy }
   */
  async getAllRooms(filters = {}) {
    let query = supabase.from('rooms').select('*');

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    // Note: status filter only applied on standard fetch (ignored during date availability search)
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.priceRange) {
      if (filters.priceRange === 'under_1000') {
        query = query.lt('price', 1000);
      } else if (filters.priceRange === '1000_1500') {
        query = query.gte('price', 1000).lte('price', 1500);
      } else if (filters.priceRange === 'above_1500') {
        query = query.gt('price', 1500);
      }
    }

    const sortBy = filters.sortBy || 'recommended';
    switch (sortBy) {
      case 'price_low':
        query = query.order('price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getRoomsCount(filters = {}) {
    let query = supabase.from('rooms').select('*', { count: 'exact', head: true });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  async getRoomById(id) {
    if (!id) throw new Error('Room ID is required.');
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createRoom(roomData) {
    const { data, error } = await supabase
      .from('rooms')
      .insert(roomData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateRoom(id, roomData) {
    if (!id) throw new Error('Room ID is required.');
    const { data, error } = await supabase
      .from('rooms')
      .update(roomData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteRoom(id) {
    if (!id) throw new Error('Room ID is required.');
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  subscribeToRooms(onUpdate) {
    const channel = supabase
      .channel('rooms-repo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        onUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
