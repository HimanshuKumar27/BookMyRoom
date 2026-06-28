// ============================================================
// Use Case — Seed Rooms
// ============================================================

export class SeedRoomsUseCase {
  constructor(roomRepository) {
    this.roomRepository = roomRepository;
  }

  async execute(sampleRooms) {
    const promises = sampleRooms.map(room => this.roomRepository.createRoom(room));
    return await Promise.all(promises);
  }
}
// ============================================================
