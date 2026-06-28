// ============================================================
// Core Interface (Port) — Authentication Service
// ============================================================

export class IAuthService {
  async getUser() {
    throw new Error('Method getUser() must be implemented.');
  }

  async signIn(email, password) {
    throw new Error('Method signIn() must be implemented.');
  }

  async signUp(email, password, fullName, phone) {
    throw new Error('Method signUp() must be implemented.');
  }

  async signOut() {
    throw new Error('Method signOut() must be implemented.');
  }

  async checkAdmin(userId) {
    throw new Error('Method checkAdmin() must be implemented.');
  }
}
