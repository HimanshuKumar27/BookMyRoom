// ============================================================
// Use Case — Get Rooms (with Filter & Availability Range)
// ============================================================

export class GetRoomsUseCase {
  constructor(roomRepository, bookingRepository) {
    this.roomRepository = roomRepository;
    this.bookingRepository = bookingRepository;
  }

  /**
   * Execute room fetching and search filter application.
   * @param {Object} filters - Standard query filters { type, city, status, priceRange, sortBy }
   * @param {Object} searchCriteria - Optional date/guests criteria { checkin, checkout, guests, rooms, hasDateRange }
   */
  async execute(filters = {}, searchCriteria = null) {
    let rooms = await this.roomRepository.getAllRooms(filters);

    if (searchCriteria && searchCriteria.hasDateRange) {
      const unavailableIds = await this.bookingRepository.getUnavailableRoomIds(
        searchCriteria.checkin,
        searchCriteria.checkout
      );

      rooms = rooms.map(room => {
        const capacityMatches = (room.capacity || 1) >= searchCriteria.guests;
        const openForSale = room.status === 'Available';
        const dateAvailable = !unavailableIds.has(room.id);
        const isSearchAvailable = openForSale && dateAvailable && capacityMatches;

        let displayStatus = 'Available';
        if (!openForSale) {
          displayStatus = 'Booked';
        } else if (!dateAvailable) {
          displayStatus = 'Unavailable';
        } else if (!capacityMatches) {
          displayStatus = 'Too Small';
        }

        return {
          ...room,
          isSearchAvailable,
          displayStatus
        };
      });

      // Filter based on requested status (if applicable)
      if (filters.status === 'Available') {
        rooms = rooms.filter(r => r.isSearchAvailable);
      } else if (filters.status === 'Booked') {
        rooms = rooms.filter(r => !r.isSearchAvailable);
      }
    }

    return rooms;
  }
}
