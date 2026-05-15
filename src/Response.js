'use strict';

const DEPOSITED = 2;
const NO_ERROR = 0;

class Response {
  constructor(data) {
    this._data = data;
  }

  /**
   * True when the payment completed successfully.
   * For status-check responses, requires orderStatus === 2 (deposited) with no error.
   * For registration responses, only requires no error code.
   */
  isSuccessful() {
    const status = this.getOrderStatus();
    if (status !== null) {
      return status === DEPOSITED && Number(this.getCode()) === NO_ERROR;
    }
    return Number(this.getCode()) === NO_ERROR;
  }

  /**
   * True when the response contains a payment page URL to redirect the customer to.
   */
  isRedirect() {
    return !!(this._data.formUrl || this._data.redirect);
  }

  /**
   * Returns the ARCA-hosted payment page URL.
   */
  getRedirectUrl() {
    return this._data.formUrl || this._data.redirect || null;
  }

  /**
   * Convenience redirect helper.
   * Pass an Express/Fastify res object to trigger the redirect automatically,
   * or omit it and handle the URL yourself.
   *
   * @param {Object} [res] - Express/Fastify response object
   * @returns {string|null}
   */
  redirect(res) {
    const url = this.getRedirectUrl();
    if (res && typeof res.redirect === 'function') {
      res.redirect(url);
    }
    return url;
  }

  /**
   * Returns the ARCA orderId assigned to this order.
   */
  getTransactionReference() {
    return this._data.orderId || null;
  }

  /**
   * Returns your original orderNumber.
   */
  getOrderNumberReference() {
    return this._data.OrderNumber || this._data.orderNumber || null;
  }

  /**
   * Returns the numeric order status.
   *
   * 0 — registered, not paid
   * 1 — pre-authorized (amount reserved)
   * 2 — deposited (fully paid)
   * 3 — cancelled
   * 4 — refunded
   * 5 — ACS authorization initiated
   * 6 — rejected
   */
  getOrderStatus() {
    return this._data.orderStatus !== undefined ? this._data.orderStatus : null;
  }

  /**
   * Returns the error code (0 = no error).
   */
  getCode() {
    if (this._data.errorCode !== undefined) return this._data.errorCode;
    if (this._data.ErrorCode !== undefined) return this._data.ErrorCode;
    return null;
  }

  /**
   * Returns the error message, or null on success.
   */
  getMessage() {
    return this._data.errorMessage || this._data.ErrorMessage || null;
  }

  /**
   * Returns the human-readable action code description.
   */
  getActionCodeDescription() {
    return this._data.actionCodeDescription || null;
  }

  /**
   * Returns the full raw response object from ARCA.
   */
  getData() {
    return this._data;
  }
}

module.exports = Response;
