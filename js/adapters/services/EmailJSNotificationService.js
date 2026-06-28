// ============================================================
// Adapter — EmailJS Notification Service
// ============================================================

import { INotificationService } from '../../core/interfaces/INotificationService.js';
import { ENV } from '../../infrastructure/config/env.js';

export class EmailJSNotificationService extends INotificationService {
  constructor() {
    super();
    this.publicKey = ENV.EMAILJS_PUBLIC_KEY;
    this.serviceId = ENV.EMAILJS_SERVICE_ID;
    this.templateId = ENV.EMAILJS_TEMPLATE_ID;
    this.adminEmail = ENV.ADMIN_EMAIL;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * Load the EmailJS SDK dynamically.
   */
  async _loadSDK() {
    if (this.isLoaded) return;
    if (!this.publicKey || !this.serviceId || !this.templateId) {
      throw new Error('EmailJS credentials are not configured.');
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('EmailJS SDK load timeout'));
      }, 10000); // 10s timeout

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.async = true;
      script.onload = () => {
        clearTimeout(timeout);
        try {
          if (window.emailjs) {
            window.emailjs.init({
              publicKey: this.publicKey,
            });
            this.isLoaded = true;
            resolve();
          } else {
            reject(new Error('EmailJS object not found after script load'));
          }
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => {
        clearTimeout(timeout);
        this.loadPromise = null;
        reject(new Error('Could not load EmailJS SDK.'));
      };
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  /**
   * Send a booking confirmation email to guest and admin in parallel.
   * @param {Object} bookingData 
   * @returns {Promise<boolean>} True if at least one email was sent successfully
   */
  async sendBookingConfirmation(bookingData) {
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn('Email confirmation timed out after 10s. Proceeding.');
        resolve(false);
      }, 10000);
    });

    const sendPromise = (async () => {
      try {
        await this._loadSDK();

        // Build discount row HTML for email if discount exists
        let discountRow = '';
        if (
          bookingData.discount &&
          parseInt(String(bookingData.discount).replace(/[^\d]/g, '')) > 0
        ) {
          discountRow = `<tr><td style="padding:8px 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="color:#10b981; font-size:14px;">Discount (${bookingData.coupon_code || 'WELCOME20'})</td><td align="right" style="color:#10b981; font-size:14px; font-weight:600;">- ${bookingData.discount}</td></tr></table></td></tr>`;
        }

        // Build template parameters
        const templateParams = {
          guest_name: bookingData.guest_name,
          email: bookingData.email,
          to_email: bookingData.email,
          room_name: bookingData.room_name,
          room_type: bookingData.room_type || '',
          room_city: bookingData.room_city || 'India',
          check_in: bookingData.check_in,
          check_out: bookingData.check_out,
          nights: bookingData.nights,
          guests: bookingData.guests || 1,
          room_charges: bookingData.room_charges || '',
          discount_row: discountRow,
          discount_amount: bookingData.discount || '0',
          coupon_code: bookingData.coupon_code || '',
          gst_label: bookingData.gst_label || 'GST @ 18%',
          tax: bookingData.tax || '',
          total_cost: bookingData.total_cost,
          booking_id: bookingData.booking_id,
          is_admin_notification: 'no',
          notification_title: 'Booking Confirmed',
          notification_color: '#10b981', // Green for guest
          admin_banner: '',
        };

        const emailPromises = [];

        // 1. Guest Confirmation
        console.log('Sending guest confirmation email...');
        emailPromises.push(
          window.emailjs
            .send(this.serviceId, this.templateId, templateParams)
            .then((res) => {
              console.log('Guest email sent:', res);
              return true;
            })
            .catch((err) => {
              console.error('Guest email failed:', err);
              return false;
            })
        );

        // 2. Admin Notification
        if (this.adminEmail) {
          console.log('Sending admin notification email...');
          const adminParams = {
            ...templateParams,
            to_email: this.adminEmail,
            email: this.adminEmail,
            admin_email: this.adminEmail,
            reply_to: bookingData.email,
            is_admin_notification: 'yes',
            notification_title: 'NEW BOOKING ALERT',
            notification_color: '#ef4444', // Red for admin
            admin_banner:
              '<div style="background-color:#fee2e2; color:#ef4444; padding:12px; text-align:center; font-weight:bold; border-radius:8px; margin-bottom:20px; border:1px solid #fecaca;">⚠️ ADMIN NOTIFICATION: NEW BOOKING RECEIVED</div>',
            admin_note: `New booking received from ${bookingData.guest_name} (${bookingData.email})`,
          };
          emailPromises.push(
            window.emailjs
              .send(this.serviceId, this.templateId, adminParams)
              .then((res) => {
                console.log('Admin email sent:', res);
                return true;
              })
              .catch((err) => {
                console.error('Admin email failed:', err);
                return false;
              })
          );
        }

        const results = await Promise.all(emailPromises);
        return results.some((r) => r === true);
      } catch (error) {
        console.error('Unexpected error in sendBookingConfirmation:', error);
        return false;
      }
    })();

    return Promise.race([sendPromise, timeoutPromise]);
  }
}
