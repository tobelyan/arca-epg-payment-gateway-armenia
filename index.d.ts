export type Language = 'hy' | 'ru' | 'en';
export type PageView = 'DESKTOP' | 'MOBILE';

export interface ArcaEpgOptions {
  username: string;
  password: string;
  testMode?: boolean;
}

export interface PurchaseParams {
  transactionId: string;
  amount: number;
  returnUrl: string;
  currency?: string;
  description?: string;
  language?: Language;
  pageView?: PageView;
  clientId?: string;
  jsonParams?: string;
  sessionTimeoutSecs?: number;
}

export interface DepositParams {
  transactionId: string;
  amount: number;
}

export interface ReverseParams {
  transactionId: string;
  language?: Language;
}

export interface RefundParams {
  transactionId: string;
  amount: number;
}

export interface OrderStatusParams {
  transactionId: string;
  language?: Language;
}

export interface MakeBindingPaymentParams {
  transactionId: string;
  amount: number;
  bindingId: string;
  currency?: string;
  clientId?: string;
  language?: Language;
  description?: string;
  jsonParams?: string;
  mdOrder?: string;
}

export interface BindingParams {
  bindingId: string;
  language?: Language;
}

export interface GetBindingsParams {
  clientId: string;
  language?: Language;
}

export interface VerifyEnrollmentParams {
  pan: string;
}

export class Response {
  isSuccessful(): boolean;
  isRedirect(): boolean;
  getRedirectUrl(): string | null;
  redirect(res?: object): string | null;
  getTransactionReference(): string | null;
  getOrderNumberReference(): string | null;
  getOrderStatus(): number | null;
  getCode(): number | null;
  getMessage(): string | null;
  getActionCodeDescription(): string | null;
  getData(): Record<string, unknown>;
}

export class ArcaEpg {
  constructor(options: ArcaEpgOptions);

  purchase(params: PurchaseParams): Promise<Response>;
  registerPreAuth(params: PurchaseParams): Promise<Response>;

  deposit(params: DepositParams): Promise<Response>;
  reverse(params: ReverseParams): Promise<Response>;
  refund(params: RefundParams): Promise<Response>;

  getOrderStatus(params: OrderStatusParams): Promise<Response>;
  getOrderStatusExtended(params: OrderStatusParams): Promise<Response>;

  makeBindingPayment(params: MakeBindingPaymentParams): Promise<Response>;
  activateCardBinding(params: Pick<BindingParams, 'bindingId'>): Promise<Response>;
  unBindCard(params: BindingParams): Promise<Response>;
  getBindings(params: GetBindingsParams): Promise<Response>;

  verifyEnrollment(params: VerifyEnrollmentParams): Promise<Response>;
}

export default ArcaEpg;
