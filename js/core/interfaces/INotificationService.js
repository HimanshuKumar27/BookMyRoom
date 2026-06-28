// ============================================================
// Core Interface (Port) — Notification Service
// ============================================================

export class INotificationService {
  async sendBookingConfirmation(bookingData) {
    throw new Error('Method sendBookingConfirmation() must be implemented.');
  }
}
