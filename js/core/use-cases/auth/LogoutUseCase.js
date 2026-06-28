// ============================================================
// Use Case — Logout
// ============================================================

export class LogoutUseCase {
  constructor(authService) {
    this.authService = authService;
  }

  async execute() {
    await this.authService.signOut();
  }
}
