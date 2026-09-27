import { etkeClient } from "../http";
import createLogger from "../../utils/logger";

import type {
  CompanyDetails,
  ComponentsResponse,
  InvoiceEmails,
  NotificationsStatus,
  PaymentsResponse,
  RecurringCommand,
  ScheduledCommand,
  ServerNotification,
  ServerNotificationsResponse,
  ServerProcessResponse,
  ServerStatusResponse,
  SupportAttachment,
  SupportMessage,
  SupportRequest,
  SupportRequestDetail,
} from "../types";

const log = createLogger("data");

export const etkeProviderMethods = {
  getServerRunningProcess: async (
    etkeAdminUrl: string,
    locale: string,
    burstCache = false
  ): Promise<ServerProcessResponse> => {
    const locked_at = "";
    const command = "";

    let serverURL = `${etkeAdminUrl}/lock`;
    if (burstCache) {
      serverURL += `?time=${new Date().getTime()}`;
    }

    try {
      const response = await etkeClient(serverURL, locale);

      if (response.status === 503) {
        return { locked_at, command, maintenance: true };
      }

      if (!response.ok) {
        log.error(`getServerRunningProcess: HTTP ${response.status} ${response.statusText}`, { url: serverURL });
        return { locked_at, command, maintenance: false };
      }
      const status = response.status;

      if (status === 200) {
        const json = await response.json();
        return json as { locked_at: string; command: string };
      }
      if (status === 204) {
        return { locked_at, command, maintenance: false };
      }
    } catch (error) {
      log.error("getServerRunningProcess failed", error);
    }

    return { locked_at, command, maintenance: false };
  },

  getServerStatus: async (etkeAdminUrl: string, locale: string, burstCache = false): Promise<ServerStatusResponse> => {
    let serverURL = `${etkeAdminUrl}/status`;
    if (burstCache) {
      serverURL += `?time=${new Date().getTime()}`;
    }

    try {
      const response = await etkeClient(serverURL, locale);

      if (response.status === 503) {
        return { success: false, ok: false, host: "", results: [], maintenance: true };
      }

      if (!response.ok) {
        log.error(`getServerStatus: HTTP ${response.status} ${response.statusText}`, { url: serverURL });
        return { success: false, ok: false, host: "", results: [] };
      }

      const status = response.status;
      if (status === 200) {
        const json = await response.json();
        return { success: true, ...json } as ServerStatusResponse;
      }
    } catch (error) {
      log.error("getServerStatus failed", error);
    }

    return { success: false, ok: false, host: "", results: [] };
  },

  getServerNotifications: async (
    etkeAdminUrl: string,
    locale: string,
    burstCache = false
  ): Promise<ServerNotificationsResponse> => {
    let serverURL = `${etkeAdminUrl}/notifications`;
    if (burstCache) {
      serverURL += `?time=${new Date().getTime()}`;
    }

    try {
      const response = await etkeClient(serverURL, locale);
      if (response.status === 503) {
        return { success: false, status: "unavailable", notifications: [] };
      }
      if (!response.ok) {
        log.error(`getServerNotifications: HTTP ${response.status} ${response.statusText}`, { url: serverURL });
        return { success: false, status: "unavailable", notifications: [] };
      }

      const advisory = response.headers.get("X-Notifications-Advisory");
      const status: NotificationsStatus = advisory === "possibly_missed" ? "advisory" : "ok";

      if (response.status === 204) {
        return { success: true, status, notifications: [] };
      }

      if (response.status === 200) {
        const json = await response.json();
        return { success: true, status, notifications: json as ServerNotification[] };
      }

      return { success: true, status, notifications: [] };
    } catch (error) {
      log.error("getServerNotifications failed", error);
    }

    return { success: false, status: "unavailable", notifications: [] };
  },

  deleteServerNotifications: async (etkeAdminUrl: string, locale: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/notifications`, locale, {
        method: "DELETE",
      });
      if (!response.ok) {
        log.error(`deleteServerNotifications: HTTP ${response.status} ${response.statusText}`);
        return { success: false };
      }

      const status = response.status;
      if (status === 204) {
        return { success: true };
      }
    } catch (error) {
      log.error("deleteServerNotifications failed", error);
    }

    return { success: false };
  },

  getUnits: async (etkeAdminUrl: string, locale: string): Promise<string[]> => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/units`, locale);

      if (!response.ok) {
        log.error(`getUnits: HTTP ${response.status} ${response.statusText}`);
        return [];
      }

      if (response.status === 204) {
        return [];
      }

      if (response.status === 200) {
        const json = await response.json();
        return json as string[];
      }
    } catch (error) {
      log.error("getUnits failed", error);
    }

    return [];
  },

  getServerCommands: async (etkeAdminUrl: string, locale: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/commands`, locale);

      if (response.status === 503) {
        return { maintenance: true, commands: [] };
      }

      if (!response.ok) {
        log.error(`getServerCommands: HTTP ${response.status} ${response.statusText}`);
        return { maintenance: false, commands: [] };
      }

      const status = response.status;

      if (status === 200) {
        const json = await response.json();
        return { maintenance: false, commands: json };
      }

      return { maintenance: false, commands: [] };
    } catch (error) {
      log.error("getServerCommands failed", error);
    }

    return { maintenance: false, commands: [] };
  },

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  runServerCommand: async (serverCommandsUrl: string, command: string, additionalArgs: Record<string, any> = {}) => {
    const endpoint_url = `${serverCommandsUrl}/commands`;
    const body = {
      command: command,
      ...additionalArgs,
    };
    const response = await fetch(endpoint_url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    if (response.status === 503) {
      return { success: false, maintenance: true };
    }

    if (!response.ok) {
      log.error(`runServerCommand: HTTP ${response.status} ${response.statusText}`, { command });
      return { success: false, maintenance: false };
    }

    if (response.status === 204) {
      log.info("server command executed", { command });
      return { success: true, maintenance: false };
    }

    return { success: false, maintenance: false };
  },

  getScheduledCommands: async (etkeAdminUrl: string, locale: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/schedules`, locale);
      if (response.status === 503) {
        return [];
      }

      if (!response.ok) {
        log.error(`getScheduledCommands: HTTP ${response.status} ${response.statusText}`);
        return [];
      }

      const status = response.status;

      if (status === 200) {
        const json = await response.json();
        return json as ScheduledCommand[];
      }

      return [];
    } catch (error) {
      log.error("getScheduledCommands failed", error);
    }
    return [];
  },

  getRecurringCommands: async (etkeAdminUrl: string, locale: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/recurrings`, locale);

      if (response.status === 503) {
        return [];
      }

      if (!response.ok) {
        log.error(`getRecurringCommands: HTTP ${response.status} ${response.statusText}`);
        return [];
      }

      const status = response.status;

      if (status === 200) {
        const json = await response.json();
        return json as RecurringCommand[];
      }

      return [];
    } catch (error) {
      log.error("getRecurringCommands failed", error);
    }
    return [];
  },

  createScheduledCommand: async (etkeAdminUrl: string, locale: string, command: Partial<ScheduledCommand>) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/schedules`, locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        log.error(`createScheduledCommand: HTTP ${response.status} ${response.statusText}`, { command });
        throw new Error("Failed to create scheduled command");
      }

      if (response.status === 204) {
        return command as ScheduledCommand;
      }

      const json = await response.json();
      return json as ScheduledCommand;
    } catch (error) {
      log.error("createScheduledCommand failed", error);
      throw error;
    }
  },

  updateScheduledCommand: async (etkeAdminUrl: string, locale: string, command: ScheduledCommand) => {
    try {
      // Use the base endpoint without ID and use PUT for upsert
      const response = await etkeClient(`${etkeAdminUrl}/schedules`, locale, {
        method: "PUT", // Using PUT on the base endpoint
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const jsonErr = JSON.parse(await response.text());
        log.error(`updateScheduledCommand: HTTP ${response.status} ${response.statusText}`, { command });
        throw new Error(jsonErr.error);
      }

      // According to docs, successful response is 204 No Content
      if (response.status === 204) {
        // Return the command object we sent since the server doesn't return data
        return command;
      }

      // If server does return data (though docs suggest it returns 204)
      const json = await response.json();
      return json as ScheduledCommand;
    } catch (error) {
      log.error("updateScheduledCommand failed", error);
      throw error;
    }
  },

  deleteScheduledCommand: async (etkeAdminUrl: string, locale: string, id: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/schedules/${id}`, locale, {
        method: "DELETE",
      });

      if (!response.ok) {
        log.error(`deleteScheduledCommand: HTTP ${response.status} ${response.statusText}`, { id });
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      log.error("deleteScheduledCommand failed", { id, error });
      return { success: false };
    }
  },

  createRecurringCommand: async (etkeAdminUrl: string, locale: string, command: Partial<RecurringCommand>) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/recurrings`, locale, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        log.error(`createRecurringCommand: HTTP ${response.status} ${response.statusText}`, { command });
        throw new Error("Failed to create recurring command");
      }

      if (response.status === 204) {
        // Return the command object we sent since the server doesn't return data
        return command as RecurringCommand;
      }

      const json = await response.json();
      return json as RecurringCommand;
    } catch (error) {
      log.error("createRecurringCommand failed", error);
      throw error;
    }
  },

  updateRecurringCommand: async (etkeAdminUrl: string, locale: string, command: RecurringCommand) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/recurrings`, locale, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        log.error(`updateRecurringCommand: HTTP ${response.status} ${response.statusText}`, { command });
        throw new Error("Failed to update recurring command");
      }

      if (response.status === 204) {
        // Return the command object we sent since the server doesn't return data
        return command as RecurringCommand;
      }

      const json = await response.json();
      return json as RecurringCommand;
    } catch (error) {
      log.error("updateRecurringCommand failed", error);
      throw error;
    }
  },

  deleteRecurringCommand: async (etkeAdminUrl: string, locale: string, id: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/recurrings/${id}`, locale, {
        method: "DELETE",
      });

      if (!response.ok) {
        log.error(`deleteRecurringCommand: HTTP ${response.status} ${response.statusText}`, { id });
        return { success: false };
      }

      return { success: true };
    } catch (error) {
      log.error("deleteRecurringCommand failed", { id, error });
      return { success: false };
    }
  },

  getComponents: async (etkeAdminUrl: string, locale: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/components`, locale);
      if (response.status === 503) {
        return { components: [], sections: [], currency: "EUR", total_price: 0 } as ComponentsResponse;
      }
      if (!response.ok) {
        log.error(`getComponents: HTTP ${response.status} ${response.statusText}`);
        return { components: [], sections: [], currency: "EUR", total_price: 0 } as ComponentsResponse;
      }
      if (response.status === 200) {
        const json = await response.json();
        return json as ComponentsResponse;
      }
    } catch (error) {
      log.error("getComponents failed", error);
    }
    return { components: [], sections: [], currency: "EUR", total_price: 0 } as ComponentsResponse;
  },

  getPayments: async (etkeAdminUrl: string, locale: string) => {
    const response = await etkeClient(`${etkeAdminUrl}/payments`, locale);

    if (response.status === 503) {
      return { payments: [], total: 0, maintenance: true };
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch payments: ${response.status} ${response.statusText}`);
    }

    const status = response.status;

    if (status === 200) {
      const json = await response.json();
      return json as PaymentsResponse;
    }

    if (status === 204) {
      return { payments: [], total: 0, maintenance: false };
    }

    throw new Error(`${response.status} ${response.statusText}`); // Handle unexpected status codes
  },

  getInvoice: async (etkeAdminUrl: string, locale: string, transactionId: string) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/payments/${transactionId}/invoice`, locale);

      if (!response.ok) {
        let errorMessage = `Error fetching invoice: ${response.status} ${response.statusText}`;

        // Handle specific error codes
        switch (response.status) {
          case 404:
            errorMessage = "Invoice not found for this transaction";
            break;
          case 500:
            errorMessage = "Server error while generating invoice. Please try again later";
            break;
          case 401:
            errorMessage = "Unauthorized access. Please check your permissions";
            break;
          case 403:
            errorMessage = "Access forbidden. You don't have permission to download this invoice";
            break;
          default:
            errorMessage = `Failed to fetch invoice (${response.status}): ${response.statusText}`;
        }

        log.error("getInvoice failed", { transactionId, status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      // Get the file as a blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Try to get filename from response headers
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `invoice_${transactionId}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      log.error("getInvoice download failed", { transactionId, error });
      throw error; // Re-throw to let the UI handle the error
    }
  },

  getSupportAttachment: async (
    etkeAdminUrl: string,
    locale: string,
    requestId: string,
    attachmentId: string,
    fileName: string
  ) => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/support/${requestId}/attachments/${attachmentId}`, locale);

      if (!response.ok) {
        let errorMessage = `Failed to download attachment (${response.status}): ${response.statusText}`;

        switch (response.status) {
          case 404:
            errorMessage = "Attachment not found";
            break;
          case 403:
            errorMessage = "Access forbidden";
            break;
          case 401:
            errorMessage = "Unauthorized";
            break;
        }

        log.error("getSupportAttachment failed", {
          requestId,
          attachmentId,
          status: response.status,
          message: errorMessage,
        });
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      log.error("getSupportAttachment download failed", { requestId, attachmentId, error });
      throw error;
    }
  },

  getInvoiceEmails: async (etkeAdminUrl: string, locale: string): Promise<InvoiceEmails> => {
    try {
      const response = await etkeClient(`${etkeAdminUrl}/invoice-emails`, locale);
      if (!response.ok) {
        log.error(`getInvoiceEmails: HTTP ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch invoice email settings");
      }
      // an empty config is a valid response, not an error, so always return the parsed body.
      return (await response.json()) as InvoiceEmails;
    } catch (error) {
      log.error("getInvoiceEmails failed", error);
      throw error;
    }
  },

  upsertInvoiceEmails: async (
    etkeAdminUrl: string,
    locale: string,
    enabled: boolean,
    emails: string[]
  ): Promise<InvoiceEmails> => {
    let response: Response;
    try {
      response = await etkeClient(`${etkeAdminUrl}/invoice-emails`, locale, {
        method: "PUT",
        body: JSON.stringify({ enabled, emails }),
      });
    } catch (error) {
      // Normalize the raw non-localized network/token error to a translatable key for the billing page.
      log.error("upsertInvoiceEmails request failed", { error });
      throw new Error("etkecc.billing.invoice_emails.error_save", { cause: error });
    }
    if (!response.ok) {
      // surface rate-limiting as its own copy so the user waits instead of hammering Save into a wall.
      if (response.status === 429) {
        log.error("upsertInvoiceEmails rate-limited", { retryAfter: response.headers.get("Retry-After") });
        throw new Error("etkecc.billing.invoice_emails.error_rate_limited");
      }
      // the error body carries a display-ready message; fall back to a local key only when it is empty.
      let errMsg = "etkecc.billing.invoice_emails.error_save";
      try {
        const body = await response.json();
        // guard the type: a non-string `error` would stringify to "[object Object]" and bury the real reason.
        if (typeof body?.error === "string" && body.error) errMsg = body.error;
      } catch {
        /* empty error body: keep the fallback key */
      }
      throw new Error(errMsg);
    }
    return (await response.json()) as InvoiceEmails;
  },

  getCompany: async (etkeAdminUrl: string, locale: string): Promise<CompanyDetails | null> => {
    let response: Response;
    try {
      response = await etkeClient(`${etkeAdminUrl}/company`, locale);
    } catch (error) {
      // Normalize the raw non-localized network/token error to a translatable key for the dialog.
      log.error("getCompany request failed", { error });
      throw new Error("etkecc.billing.company_details.error_load", { cause: error });
    }
    if (response.status === 204) {
      return null;
    }
    if (!response.ok) {
      log.error(`getCompany: HTTP ${response.status} ${response.statusText}`);
      // the error body carries a display-ready message; fall back to a local key only when it is empty.
      let errMsg = "etkecc.billing.company_details.error_load";
      try {
        const body = await response.json();
        // guard the type: a non-string or blank `error` would render an empty Alert or "[object Object]".
        if (typeof body?.error === "string" && body.error.trim()) errMsg = body.error;
      } catch {
        /* empty error body: keep the fallback key */
      }
      throw new Error(errMsg);
    }
    return (await response.json()) as CompanyDetails;
  },

  upsertCompany: async (etkeAdminUrl: string, locale: string, company: CompanyDetails): Promise<CompanyDetails> => {
    let response: Response;
    try {
      response = await etkeClient(`${etkeAdminUrl}/company`, locale, {
        method: "POST",
        body: JSON.stringify(company),
      });
    } catch (error) {
      log.error("upsertCompany request failed", { error });
      throw new Error("etkecc.billing.company_details.error", { cause: error });
    }
    if (!response.ok) {
      log.error(`upsertCompany: HTTP ${response.status} ${response.statusText}`);
      // VIES and field errors arrive as display-ready localized text; the key only covers an empty body.
      let errMsg = "etkecc.billing.company_details.error";
      try {
        const body = await response.json();
        // a blank or non-string `error` must not replace the fallback with an empty Alert.
        if (typeof body?.error === "string" && body.error.trim()) errMsg = body.error;
      } catch {
        /* empty error body: keep the fallback key */
      }
      throw new Error(errMsg);
    }
    if (response.status === 204) {
      // a 204 carries no body; echo the company we sent, same as the other upsert methods.
      return company;
    }
    return (await response.json()) as CompanyDetails;
  },

  getSupportRequests: async (etkeAdminUrl: string, locale: string) => {
    const response = await etkeClient(`${etkeAdminUrl}/support`, locale);
    if (response.status === 204) {
      return [];
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch support requests: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    return (json.requests ?? json) as SupportRequest[];
  },

  getSupportRequest: async (etkeAdminUrl: string, locale: string, id: string, burstCache = false) => {
    let url = `${etkeAdminUrl}/support/${id}`;
    if (burstCache) url += `?time=${new Date().getTime()}`;
    const response = await etkeClient(url, locale);
    if (!response.ok) {
      throw new Error(`Failed to fetch support request: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    return json as SupportRequestDetail;
  },

  createSupportRequest: async (
    etkeAdminUrl: string,
    locale: string,
    subject: string,
    message: string,
    attachments?: SupportAttachment[]
  ) => {
    const response = await etkeClient(`${etkeAdminUrl}/support`, locale, {
      method: "POST",
      body: JSON.stringify({ subject, message, ...(attachments?.length ? { attachments } : {}) }),
    });
    if (!response.ok) {
      let errMsg = "etkecc.support.actions.create_failure";
      try {
        const body = await response.json();
        if (body?.error) errMsg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(errMsg);
    }
    const json = await response.json();
    return json as SupportRequest;
  },

  postSupportMessage: async (
    etkeAdminUrl: string,
    locale: string,
    id: string,
    message: string,
    attachments?: SupportAttachment[],
    close?: boolean
  ) => {
    const response = await etkeClient(`${etkeAdminUrl}/support/${id}`, locale, {
      method: "POST",
      body: JSON.stringify({ message, ...(close ? { close } : {}), ...(attachments?.length ? { attachments } : {}) }),
    });
    if (!response.ok) {
      let errMsg = "etkecc.support.actions.send_failure";
      try {
        const body = await response.json();
        if (body?.error) errMsg = body.error;
      } catch {
        /* ignore */
      }
      throw new Error(errMsg);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return {} as SupportMessage;
    }
    const json = await response.json();
    return json as SupportMessage;
  },
};
