// ============================================================
// Use Case — Create Booking
// ============================================================

export class CreateBookingUseCase {
  constructor(bookingRepository, roomRepository, notificationService, cacheService) {
    this.bookingRepository = bookingRepository;
    this.roomRepository = roomRepository;
    this.notificationService = notificationService;
    this.cacheService = cacheService;
  }

  async execute(bookingData) {
    // 1. Fetch latest room status
    const latestRoom = await this.roomRepository.getRoomById(bookingData.room_id);
    if (!latestRoom) {
      throw new Error('Selected room does not exist.');
    }
    if (latestRoom.status !== 'Available') {
      throw new Error('This room is no longer available.');
    }
    if ((latestRoom.capacity || 1) < bookingData.guests) {
      throw new Error(`This room is too small for ${bookingData.guests} guests.`);
    }

    // 2. Check check-in/out availability
    const unavailableIds = await this.bookingRepository.getUnavailableRoomIds(
      bookingData.check_in,
      bookingData.check_out
    );
    if (unavailableIds.has(bookingData.room_id)) {
      throw new Error('This room is already booked for the selected dates.');
    }

    // 3. Insert booking
    const newBooking = await this.bookingRepository.createBooking(bookingData);

    // 4. Store in Session Cache for Success Page (will trigger async email on the success page)
    this.cacheService.setItem('lastBooking', {
      ...bookingData,
      bookingId: newBooking.id,
      emailSent: 'pending',
      createdAt: new Date().toISOString()
    });

    return newBooking;
  }
}
