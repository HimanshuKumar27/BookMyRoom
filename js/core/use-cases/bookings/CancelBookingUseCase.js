// ============================================================
// Use Case — Cancel Booking
// ============================================================

export class CancelBookingUseCase {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async execute(bookingId) {
    if (!bookingId) throw new Error('Booking ID is required.');
    return await this.bookingRepository.updateBookingStatus(bookingId, 'Cancelled');
  }
}
