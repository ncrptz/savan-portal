// Payment-provider abstraction. Paystack is implemented; Flutterwave and Remita
// slot in by adding an entry to PROVIDERS with the same shape.

export interface InitArgs {
  reference: string
  amountNaira: number
  email: string
  callbackUrl: string
  metadata: Record<string, any>
}
export interface VerifyResult { success: boolean; amountNaira?: number }

export interface PaymentProvider {
  name: string
  configured(): boolean
  initialize(a: InitArgs): Promise<{ checkoutUrl: string }>
  verify(reference: string): Promise<VerifyResult>
}

// ── Paystack ──────────────────────────────────────────────────────────────────
const paystack: PaymentProvider = {
  name: 'paystack',
  configured() { return !!process.env.PAYSTACK_SECRET_KEY },
  async initialize({ reference, amountNaira, email, callbackUrl, metadata }) {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amountNaira * 100),   // kobo
        currency: 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
      throw new Error(json?.message || 'Paystack could not start the transaction')
    }
    return { checkoutUrl: json.data.authorization_url as string }
  },
  async verify(reference) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const json: any = await res.json().catch(() => ({}))
    const ok = res.ok && json?.status && json?.data?.status === 'success'
    return { success: !!ok, amountNaira: json?.data?.amount ? json.data.amount / 100 : undefined }
  },
}

// ── Registry ──────────────────────────────────────────────────────────────────
export const PROVIDERS: Record<string, PaymentProvider> = {
  paystack,
  // flutterwave: { ... },   // add when keys are available
  // remita:      { ... },
}

export function getProvider(name: string): PaymentProvider | null {
  return PROVIDERS[name] ?? null
}
