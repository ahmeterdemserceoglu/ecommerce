export interface PaymentProvider {
  id: string
  name: string
  logo: string
  isActive: boolean
  supportedBanks: Bank[]
  commissionRate: number // Yüzde olarak
  fixedFee: number // TL olarak
}

export interface Bank {
  id: string
  name: string
  logo: string
  supportedCardTypes: string[] // ["VISA", "MASTERCARD", "AMEX", "TROY"]
  installmentOptions: InstallmentOption[]
  posApiEndpoint: string
  posApiKey?: string
  posApiSecret?: string
  isActive: boolean
}

export interface InstallmentOption {
  count: number // Taksit sayısı
  commissionRate: number // Yüzde olarak
}

export interface PaymentMethod {
  id: string
  type: "CREDIT_CARD" | "BANK_TRANSFER" | "WALLET"
  name: string
  isDefault: boolean
  isActive: boolean
}

export interface CardToken {
  id: string
  userId: string
  cardHolderName: string
  lastFourDigits: string
  expiryMonth: string
  expiryYear: string
  cardType: string
  bankId: string
  tokenValue: string
  isDefault: boolean
  createdAt: Date
}

export interface PaymentTransaction {
  id: string
  orderId: string
  storeId: string
  sellerId: string
  amount: number
  currency: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED"
  paymentMethod: string
  paymentProvider: string
  bankId: string
  installmentCount: number
  cardLastFour: string
  transactionId: string // Banka tarafından verilen ID
  errorCode?: string
  errorMessage?: string
  is3DSecure: boolean
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface SellerPayoutTransaction {
  id: string
  sellerId: string
  storeId: string
  amount: number
  currency: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  paymentMethod: string
  bankAccountId: string
  transactionId?: string
  description: string
  createdAt: Date
  completedAt?: Date
}

export interface SellerBankAccount {
  id: string
  sellerId: string
  bankName: string
  accountHolderName: string
  iban: string
  isDefault: boolean
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TaxSettings {
  id: string
  name: string
  type: "KDV" | "STOPAJ" | "GELIR_VERGISI" | "MUHTASAR"
  rate: number
  isActive: boolean
  appliesTo: "ALL" | "PRODUCT_CATEGORY" | "SELLER_TYPE"
  categoryIds?: string[]
  sellerTypes?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceSettings {
  id: string
  sellerId: string
  isEInvoiceUser: boolean
  taxOffice: string
  taxNumber: string
  companyName: string
  address: string
  phone: string
  email: string
  mersis?: string
  gibUsername?: string
  gibPassword?: string
  gibApiKey?: string
  autoInvoiceGeneration: boolean
  invoicePrefix: string
  invoiceNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  sellerId: string
  buyerId: string
  buyerType: "INDIVIDUAL" | "CORPORATE"
  buyerName: string
  buyerTaxNumber?: string
  buyerTaxOffice?: string
  buyerAddress: string
  items: InvoiceItem[]
  subtotal: number
  taxTotal: number
  total: number
  currency: string
  status: "DRAFT" | "ISSUED" | "CANCELED" | "REJECTED"
  type: "E_ARSIV" | "E_FATURA"
  gibUuid?: string
  pdfUrl?: string
  xmlUrl?: string
  createdAt: Date
  issuedAt?: Date
  canceledAt?: Date
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  productId: string
  variantId?: string
  name: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  totalAmount: number
}

export interface PaymentSummary {
  totalSales: number
  pendingPayouts: number
  completedPayouts: number
  commissionsPaid: number
  taxesPaid: number
  netIncome: number
}
