export interface ServerStatusComponent {
  ok: boolean;
  category: string;
  reason: string;
  url: string;
  help: string;
  label: {
    url: string;
    icon: string;
    text: string;
  };
}

export interface ServerStatusResponse {
  success: boolean;
  maintenance?: boolean;
  ok: boolean;
  host: string;
  results: ServerStatusComponent[];
}

export interface ServerProcessResponse {
  locked_at: string;
  command: string;
  maintenance?: boolean;
}

export interface ServerNotification {
  event_id: string;
  output: string;
  sent_at: string;
}

export type NotificationsStatus = "ok" | "advisory" | "unavailable";

export interface ServerNotificationsResponse {
  success: boolean;
  status: NotificationsStatus;
  notifications: ServerNotification[];
}

export interface ServerCommand {
  icon: string;
  name: string;
  description: string;
  args: boolean;
  with_lock: boolean;
  additionalArgs?: string;
}

export type ServerCommandsResponse = Record<string, ServerCommand>;

export interface ScheduledCommand {
  args: string;
  command: string;
  id: string;
  is_recurring: boolean;
  scheduled_at: string;
}

export interface RecurringCommand {
  args: string;
  command: string;
  id: string;
  scheduled_at: string;
  time: string;
}

export interface Payment {
  amount: number;
  currency: string;
  email: string;
  is_subscription: boolean;
  paid_at: string;
  transaction_id: string;
  invoice_id: string;
}

export interface PaymentStatus {
  due_at: string;
  expected_price: number;
  mismatch: boolean;
  overdue: boolean;
}

export interface PaymentsResponse {
  payments: Payment[];
  maintenance: boolean;
  total: number;
  status?: PaymentStatus;
}

export interface InvoiceEmails {
  enabled: boolean;
  emails: string[];
  // Count of invoices this save canceled; only this PUT reports nonzero, a GET or repeat save returns 0.
  canceled?: number;
}

export interface CompanyDetails {
  fiscal_id: string;
  name: string;
  country: string;
  address: string;
  postal_code: string;
  city: string;
}

export interface Component {
  id: string;
  name: string;
  enabled: boolean;
  archived?: boolean;
  price: number;
  help: string;
}

export interface ComponentSection {
  id: string;
  name: string;
  enabled: boolean;
  archived?: boolean;
  price: number;
  help: string;
  components: Component[];
}

export interface ComponentsResponse {
  components: Component[];
  sections: ComponentSection[];
  currency: string;
  total_price: number;
}

export interface SupportRequest {
  id: number;
  subject: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupportAttachmentMeta {
  id: number;
  fileName: string;
  mimeType?: string;
  size?: number; // bytes
}

export interface SupportMessage {
  id?: number;
  type: string;
  text: string;
  created_by?: {
    firstName: string;
    avatarUrl?: string;
    email?: string;
  };
  created_at?: string;
  attachments?: SupportAttachmentMeta[];
}

export interface SupportRequestDetail extends SupportRequest {
  messages: SupportMessage[];
}

export interface SupportAttachment {
  fileName: string;
  data: string; // base64-encoded file content
}
