// ============================================================
// Use Case — Register
// ============================================================

export class RegisterUseCase {
  constructor(authService) {
    this.authService = authService;
  }

  async execute(email, password, fullName, phone) {
    return await this.authService.signUp(email, password, fullName, phone);
  }
}
