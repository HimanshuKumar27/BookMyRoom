// ============================================================
// Use Case — Admin Manage Rooms (Create, Update, Delete, Toggle)
// ============================================================

export class ManageRoomsUseCase {
  constructor(roomRepository) {
    this.roomRepository = roomRepository;
  }

  async saveRoom(id, roomData) {
    if (id) {
      return await this.roomRepository.updateRoom(id, roomData);
    } else {
      return await this.roomRepository.createRoom(roomData);
    }
  }

  async deleteRoom(id) {
    await this.roomRepository.deleteRoom(id);
  }

  async toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Available' ? 'Booked' : 'Available';
    return await this.roomRepository.updateRoom(id, { status: newStatus });
  }
}
