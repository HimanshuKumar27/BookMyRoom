// ============================================================
// Core Interface (Port) — Booking Repository
// ============================================================

export class IBookingRepository {
  async getBookingsByUserId(userId) {
    throw new Error('Method getBookingsByUserId() must be implemented.');
  }

  async getAllBookings(options = {}) {
    throw new Error('Method getAllBookings() must be implemented.');
  }

  async getBookingsCount() {
    throw new Error('Method getBookingsCount() must be implemented.');
  }

  async getTodayBookingsCount() {
    throw new Error('Method getTodayBookingsCount() must be implemented.');
  }

  async createBooking(bookingData) {
    throw new Error('Method createBooking() must be implemented.');
  }

  async updateBookingStatus(id, status) {
    throw new Error('Method updateBookingStatus() must be implemented.');
  }

  async getUnavailableRoomIds(checkin, checkout) {
    throw new Error('Method getUnavailableRoomIds() must be implemented.');
  }

  subscribeToBookings(onUpdate) {
    throw new Error('Method subscribeToBookings() must be implemented.');
  }
}
