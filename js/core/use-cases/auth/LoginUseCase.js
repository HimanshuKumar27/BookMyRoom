// ============================================================
// Use Case — Login
// ============================================================

export class LoginUseCase {
  constructor(authService, cacheService) {
    this.authService = authService;
    this.cacheService = cacheService;
  }

  async execute(email, password, rememberMe) {
    const data = await this.authService.signIn(email, password);
    
    if (rememberMe) {
      this.cacheService.setItem('brm_remembered_email', email);
    } else {
      this.cacheService.removeItem('brm_remembered_email');
    }
    
    return data;
  }
}
