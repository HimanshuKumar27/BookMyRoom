// ============================================================
// Adapter — Supabase Booking Repository
// ============================================================

import { IBookingRepository } from '../../core/interfaces/IBookingRepository.js';
import { supabase } from '../../infrastructure/database/supabase-client.js';

export class SupabaseBookingRepository extends IBookingRepository {
  async getBookingsByUserId(userId) {
    if (!userId) throw new Error('User ID is required.');
    const { data, error } = await supabase
      .from('bookings')
      .select('*, rooms(images)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAllBookings(options = {}) {
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.limit) {
      const start = options.offset || 0;
      const end = start + options.limit - 1;
      query = query.range(start, end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getBookingsCount() {
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }

  async getTodayBookingsCount() {
    const todayStr = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStr);

    if (error) throw error;
    return count || 0;
  }

  async createBooking(bookingData) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBookingStatus(id, status) {
    if (!id) throw new Error('Booking ID is required.');
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUnavailableRoomIds(checkin, checkout) {
    if (!checkin || !checkout || checkout <= checkin) return new Set();

    const { data, error } = await supabase
      .from('bookings')
      .select('room_id, check_in, check_out, status')
      .lt('check_in', checkout)
      .gt('check_out', checkin)
      .neq('status', 'Cancelled');

    if (error) throw error;

    const unavailable = new Set();
    (data || []).forEach(b => {
      // Overlap logic: booking starts before checkout and ends after checkin
      if (b.check_in < checkout && b.check_out > checkin) {
        unavailable.add(b.room_id);
      }
    });

    return unavailable;
  }

  subscribeToBookings(onUpdate) {
    const channel = supabase
      .channel('bookings-repo-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        onUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
