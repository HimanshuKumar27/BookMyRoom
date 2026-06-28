// ============================================================
// Use Case — Get User Bookings
// ============================================================

export class GetUserBookingsUseCase {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async execute(userId) {
    if (!userId) throw new Error('User ID is required.');
    return await this.bookingRepository.getBookingsByUserId(userId);
  }
}
