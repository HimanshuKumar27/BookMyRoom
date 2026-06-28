// ============================================================
// UI Component — Shared Footer
// ============================================================

/**
 * Inject the shared footer into the page footer element.
 */
export function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="assets/apple-touch-icon.png" alt="Book My Room Icon" width="22" height="22" style="display:inline-block;vertical-align:-3px;margin-right:4px;border-radius:4px;">
          BookMyRoom
        </div>
        <p class="footer-desc">
          Find and book hotels across India with the best prices. 
          Simple booking, verified properties, and 24/7 support.
        </p>
      </div>
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="rooms.html">All Rooms</a></li>
          <li><a href="booking.html">Book Now</a></li>
          <li><a href="my-bookings.html">My Bookings</a></li>
          <li><a href="login.html">Login / Register</a></li>
        </ul>
      </div>
      <div>
        <h4>Top Cities</h4>
        <ul>
          <li><a href="rooms.html?city=Jaipur">Jaipur</a></li>
          <li><a href="rooms.html?city=Goa">Goa</a></li>
          <li><a href="rooms.html?city=Udaipur">Udaipur</a></li>
          <li><a href="rooms.html?city=Shimla">Shimla</a></li>
          <li><a href="rooms.html?city=Manali">Manali</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Sec 102, Bhangel, Noida
          </li>
          <li>
            <a href="tel:+917011121740" style="color:rgba(255,255,255,0.5);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              +91 7011121740
            </a>
          </li>
          <li>
            <a href="mailto:365himanshukumar@gmail.com" style="color:rgba(255,255,255,0.5);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              365himanshukumar@gmail.com
            </a>
          </li>
          <li>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:6px;">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            24/7 Support
          </li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; ${new Date().getFullYear()} BookMyRoom. All Rights Reserved.
    </div>
  `;
}
