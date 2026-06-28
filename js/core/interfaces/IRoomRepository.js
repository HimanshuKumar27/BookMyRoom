// ============================================================
// Core Interface (Port) — Room Repository
// ============================================================

export class IRoomRepository {
  async getAllRooms() {
    throw new Error('Method getAllRooms() must be implemented.');
  }

  async getRoomsCount(filters = {}) {
    throw new Error('Method getRoomsCount() must be implemented.');
  }

  async getRoomById(id) {
    throw new Error('Method getRoomById() must be implemented.');
  }

  async createRoom(roomData) {
    throw new Error('Method createRoom() must be implemented.');
  }

  async updateRoom(id, roomData) {
    throw new Error('Method updateRoom() must be implemented.');
  }

  async deleteRoom(id) {
    throw new Error('Method deleteRoom() must be implemented.');
  }

  subscribeToRooms(onUpdate) {
    throw new Error('Method subscribeToRooms() must be implemented.');
  }
}
