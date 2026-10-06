export interface AdminUser {
  userId: string;
  fullName: string;
  email: string;
  role: string | number;
}
export interface Application {
  muaId: string;
  fullName: string;
  avatarUrl?: string | null;
  city?: string | null;
  experienceYears: number;
  verificationStatus: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  activeServiceCount: number;
  publicPortfolioImageCount: number;
  completionPercentage: number;
}
export interface Requirement {
  key: string;
  label: string;
  isMet: boolean;
  current?: number | null;
  required?: number | null;
}
export interface ApplicationDetail {
  profile: {
    fullName: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    district?: string | null;
    bio?: string | null;
    experienceYears: number;
    experienceLevel?: string | null;
    styles: string[];
    services: {
      serviceId: string;
      serviceName: string | null;
      price: number;
      durationMinutes: number;
      description?: string | null;
      imageUrls?: string[];
      imageUrl?: string | null;
      isActive: boolean;
    }[];
    portfolio: {
      portfolioId: string;
      title?: string | null;
      imageUrls: string[];
    }[];
  };
  verificationDocuments: {
    identityFrontUrl?: string | null;
    identityBackUrl?: string | null;
    portraitUrl?: string | null;
    certificateUrls: string[];
  };
  eligibility: {
    verificationStatus: string;
    profileStatus: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    requirements: Requirement[];
    canReceiveBookings: boolean;
  };
}
export interface BankReviewRequest {
  reviewToken: string;
  reason?: string;
  note?: string;
}
export interface FinancialQr {
  payoutId?: string;
  refundId?: string;
  accountId?: string;
  amount?: number;
  imageDataUrl: string;
  kind?: string;
  containsPayoutAmount?: boolean;
  containsRefundAmount?: boolean;
}
export interface BankAccount {
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  reviewNote?: string | null;
  id: string;
  reviewToken: string;
  hasFinancialQr: boolean;
  verificationStatus: string;
  ownerId: string;
  ownerName?: string | null;
  bankCode: string;
  bankBin: string;
  bankName?: string | null;
  accountNumber: string;
  accountHolderName: string;
  method: string | number;
  qrCodeUrl?: string | null;
  createdAt: string;
}
export interface MoneyRecord {
  id?: string | null;
  refundId?: string | null;
  bookingId?: string | null;
  amount: number;
  status: string | number;
  customerName?: string | null;
  accountHolderName?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  maskedAccountNumber?: string | null;
  destinationBankName?: string | null;
  destinationAccountName?: string | null;
  destinationAccountNumber?: string | null;
  maskedDestinationAccountNumber?: string | null;
  destinationQrCodeUrl?: string | null;
  qrCodeUrl?: string | null;
  createdAt: string;
  processingAt?: string | null;
  paidAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  failureMessage?: string | null;
  providerReference?: string | null;
  providerPayoutId?: string | null;
  lastProviderState?: string | null;
  attemptCount?: number;
  failureCode?: string | null;
  reconciledAt?: string | null;
  receivableIds?: string[];
  provider?: string | number;
  reason?: string | null;
}
export interface Campaign {
  id: string;
  title: string;
  body: string;
  audience: string;
  recipientCount: number;
  createdAt: string;
  status: string;
  url?: string | null;
}
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Style {
  styleId: number;
  name: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
}
export interface DirectoryUser extends AdminUser {
  isActive?: boolean;
  avatarUrl?: string | null;
}
export interface BankApproval {
  id: string;
  verificationStatus: string;
  activatedAt: string | null;
  isUsable: boolean;
  canReceiveMoney: boolean;
  isCoolingDown: boolean;
  unavailableReason: string;
}
export interface RejectionRequest {
  reason: string;
  reasonCodes: string[];
  items: { section: string; field: string; message: string }[];
}
export interface NotificationRequest {
  title: string;
  body: string;
  audience: string;
  userIds: string[];
  url?: string | null;
  idempotencyKey: string;
}
export interface FinancialRequest {
  reference?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  confirmedFundsNotSent?: boolean;
}
