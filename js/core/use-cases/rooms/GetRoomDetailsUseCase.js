// ============================================================
// Use Case — Get Room Details & Recently Viewed Management
// ============================================================

export class GetRoomDetailsUseCase {
  constructor(roomRepository, cacheService) {
    this.roomRepository = roomRepository;
    this.cacheService = cacheService;
  }

  async execute(roomId) {
    const room = await this.roomRepository.getRoomById(roomId);
    if (room) {
      this._addToRecentlyViewed(room);
    }
    return room;
  }

  _addToRecentlyViewed(room) {
    let recentlyViewed = this.cacheService.getItem('brm_recent') || [];
    if (!Array.isArray(recentlyViewed)) {
      recentlyViewed = [];
    }
    
    // Filter out current room if it was already in the list
    recentlyViewed = recentlyViewed.filter(r => r.id !== room.id);
    
    // Insert at front
    recentlyViewed.unshift({
      id: room.id,
      name: room.name,
      city: room.city,
      price: room.price,
      image: (room.images && room.images.length > 0) ? room.images[0] : '',
      type: room.type,
      rating: room.rating || 4.5
    });

    // Keep only last 4 items
    if (recentlyViewed.length > 4) {
      recentlyViewed.pop();
    }

    this.cacheService.setItem('brm_recent', recentlyViewed);
  }
}
