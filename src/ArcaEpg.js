'use strict';

const axios = require('axios');
const Response = require('./Response');

const ENDPOINT_PRODUCTION = 'https://epg.arca.am/payment/rest';
const ENDPOINT_TEST = 'https://testepg.arca.am/payment/rest';

class ArcaEpg {
  /**
   * @param {Object} options
   * @param {string} options.username - Merchant username provided by ARCA
   * @param {string} options.password - Merchant password provided by ARCA
   * @param {boolean} [options.testMode=false] - Use test environment
   */
  constructor(options = {}) {
    if (!options.username) throw new Error('ArcaEpg: username is required');
    if (!options.password) throw new Error('ArcaEpg: password is required');

    this._username = options.username;
    this._password = options.password;
    this._baseUrl = options.testMode ? ENDPOINT_TEST : ENDPOINT_PRODUCTION;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _require(params, keys) {
    for (const key of keys) {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        throw new Error(`ArcaEpg: "${key}" is required`);
      }
    }
  }

  async _post(endpoint, params) {
    const payload = new URLSearchParams({
      userName: this._username,
      password: this._password,
      ...params,
    });

    const res = await axios.post(`${this._baseUrl}/${endpoint}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return new Response(res.data);
  }

  // ---------------------------------------------------------------------------
  // Order registration
  // ---------------------------------------------------------------------------

  /**
   * Register a new order and receive a payment form URL.
   * Redirect the customer to `response.getRedirectUrl()` to complete payment.
   *
   * Amount must be in minor units (e.g. pass 1000 for 10.00 AMD).
   *
   * @param {Object} params
   * @param {string} params.transactionId       Your unique order number
   * @param {number} params.amount              Amount in minor units
   * @param {string} params.returnUrl           URL to redirect customer after payment
   * @param {string} [params.currency]          ISO 4217 numeric code (051 = AMD, 840 = USD)
   * @param {string} [params.description]       Order description
   * @param {'hy'|'ru'|'en'} [params.language]
   * @param {'DESKTOP'|'MOBILE'} [params.pageView]
   * @param {string} [params.clientId]          Required when saving a card binding
   * @param {string} [params.jsonParams]        JSON string of extra parameters
   * @param {number} [params.sessionTimeoutSecs]
   * @returns {Promise<Response>}
   */
  async purchase(params = {}) {
    this._require(params, ['transactionId', 'amount', 'returnUrl']);

    const data = {
      orderNumber: params.transactionId,
      amount: params.amount,
      returnUrl: params.returnUrl,
    };

    if (params.currency) data.currency = params.currency;
    if (params.description) data.description = params.description;
    if (params.language) data.language = params.language;
    if (params.pageView) data.pageView = params.pageView;
    if (params.clientId) data.clientId = params.clientId;
    if (params.jsonParams) data.jsonParams = params.jsonParams;
    if (params.sessionTimeoutSecs) data.sessionTimeoutSecs = params.sessionTimeoutSecs;

    return this._post('register.do', data);
  }

  /**
   * Register a two-phase (pre-authorization) order.
   * The amount is reserved but not charged until you call deposit().
   * Accepts the same parameters as purchase().
   *
   * @returns {Promise<Response>}
   */
  async registerPreAuth(params = {}) {
    this._require(params, ['transactionId', 'amount', 'returnUrl']);

    const data = {
      orderNumber: params.transactionId,
      amount: params.amount,
      returnUrl: params.returnUrl,
    };

    if (params.currency) data.currency = params.currency;
    if (params.description) data.description = params.description;
    if (params.language) data.language = params.language;
    if (params.pageView) data.pageView = params.pageView;
    if (params.clientId) data.clientId = params.clientId;
    if (params.jsonParams) data.jsonParams = params.jsonParams;
    if (params.sessionTimeoutSecs) data.sessionTimeoutSecs = params.sessionTimeoutSecs;

    return this._post('registerPreAuth.do', data);
  }

  // ---------------------------------------------------------------------------
  // Order lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Confirm (charge) a pre-authorized order.
   *
   * @param {Object} params
   * @param {string} params.transactionId  ARCA orderId from registerPreAuth
   * @param {number} params.amount         Amount to charge in minor units
   * @returns {Promise<Response>}
   */
  async deposit(params = {}) {
    this._require(params, ['transactionId', 'amount']);

    return this._post('deposit.do', {
      orderId: params.transactionId,
      amount: params.amount,
    });
  }

  /**
   * Cancel / reverse a registered or pre-authorized order.
   *
   * @param {Object} params
   * @param {string} params.transactionId  ARCA orderId
   * @param {'hy'|'ru'|'en'} [params.language]
   * @returns {Promise<Response>}
   */
  async reverse(params = {}) {
    this._require(params, ['transactionId']);

    const data = { orderId: params.transactionId };
    if (params.language) data.language = params.language;

    return this._post('reverse.do', data);
  }

  /**
   * Refund a completed (deposited) order.
   *
   * @param {Object} params
   * @param {string} params.transactionId  ARCA orderId
   * @param {number} params.amount         Amount to refund in minor units
   * @returns {Promise<Response>}
   */
  async refund(params = {}) {
    this._require(params, ['transactionId', 'amount']);

    return this._post('refund.do', {
      orderId: params.transactionId,
      amount: params.amount,
    });
  }

  // ---------------------------------------------------------------------------
  // Order status
  // ---------------------------------------------------------------------------

  /**
   * Get basic order status.
   *
   * @param {Object} params
   * @param {string} params.transactionId  ARCA orderId
   * @param {'hy'|'ru'|'en'} [params.language]
   * @returns {Promise<Response>}
   */
  async getOrderStatus(params = {}) {
    this._require(params, ['transactionId']);

    const data = { orderId: params.transactionId };
    if (params.language) data.language = params.language;

    return this._post('getOrderStatus.do', data);
  }

  /**
   * Get extended order status including card details and binding info.
   *
   * @param {Object} params
   * @param {string} params.transactionId  ARCA orderId
   * @param {'hy'|'ru'|'en'} [params.language]
   * @returns {Promise<Response>}
   */
  async getOrderStatusExtended(params = {}) {
    this._require(params, ['transactionId']);

    const data = { orderId: params.transactionId };
    if (params.language) data.language = params.language;

    return this._post('getOrderStatusExtended.do', data);
  }

  // ---------------------------------------------------------------------------
  // Card binding (tokenization)
  // ---------------------------------------------------------------------------

  /**
   * Pay using a previously saved card binding (silent payment).
   * If 3DS is required, the response will be a redirect instead.
   *
   * @param {Object} params
   * @param {string} params.transactionId  Your unique order number
   * @param {number} params.amount         Amount in minor units
   * @param {string} params.bindingId      Saved binding ID
   * @param {string} [params.currency]
   * @param {string} [params.clientId]
   * @param {'hy'|'ru'|'en'} [params.language]
   * @param {string} [params.description]
   * @param {string} [params.jsonParams]
   * @param {string} [params.mdOrder]      ARCA orderId if pre-registered
   * @returns {Promise<Response>}
   */
  async makeBindingPayment(params = {}) {
    this._require(params, ['transactionId', 'amount', 'bindingId']);

    const data = {
      orderNumber: params.transactionId,
      amount: params.amount,
      bindingId: params.bindingId,
    };

    if (params.currency) data.currency = params.currency;
    if (params.clientId) data.clientId = params.clientId;
    if (params.language) data.language = params.language;
    if (params.description) data.description = params.description;
    if (params.jsonParams) data.jsonParams = params.jsonParams;
    if (params.mdOrder) data.mdOrder = params.mdOrder;

    return this._post('paymentOrderBinding.do', data);
  }

  /**
   * Activate a card binding.
   *
   * @param {Object} params
   * @param {string} params.bindingId
   * @returns {Promise<Response>}
   */
  async activateCardBinding(params = {}) {
    this._require(params, ['bindingId']);

    return this._post('bindCard.do', { bindingId: params.bindingId });
  }

  /**
   * Deactivate (unbind) a saved card.
   *
   * @param {Object} params
   * @param {string} params.bindingId
   * @param {'hy'|'ru'|'en'} [params.language]
   * @returns {Promise<Response>}
   */
  async unBindCard(params = {}) {
    this._require(params, ['bindingId']);

    const data = { bindingId: params.bindingId };
    if (params.language) data.language = params.language;

    return this._post('unBindCard.do', data);
  }

  /**
   * Get all card bindings registered for a client.
   *
   * @param {Object} params
   * @param {string} params.clientId
   * @param {'hy'|'ru'|'en'} [params.language]
   * @returns {Promise<Response>}
   */
  async getBindings(params = {}) {
    this._require(params, ['clientId']);

    const data = { clientId: params.clientId };
    if (params.language) data.language = params.language;

    return this._post('getBindings.do', data);
  }

  // ---------------------------------------------------------------------------
  // 3DS
  // ---------------------------------------------------------------------------

  /**
   * Check whether a card is enrolled in 3DS.
   *
   * @param {Object} params
   * @param {string} params.pan  Card number (PAN)
   * @returns {Promise<Response>}
   */
  async verifyEnrollment(params = {}) {
    this._require(params, ['pan']);

    return this._post('verifyEnrollment.do', { pan: params.pan });
  }
}

module.exports = ArcaEpg;
