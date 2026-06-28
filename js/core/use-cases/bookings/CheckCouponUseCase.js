// ============================================================
// Use Case — Check New Customer Coupon Eligibility
// ============================================================

export class CheckCouponUseCase {
  constructor(bookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  async execute(userId) {
    if (!userId) return { eligible: false, bookingCount: 0 };
    try {
      const bookings = await this.bookingRepository.getBookingsByUserId(userId);
      const count = bookings.length;
      return { eligible: count < 3, bookingCount: count };
    } catch {
      return { eligible: false, bookingCount: 0 };
    }
  }
}
