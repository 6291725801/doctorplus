import { describe, it, expect, beforeEach } from "vitest";
import { GET as logoutGet, POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as contactPost } from "@/app/api/contact/route";
import { NextRequest } from "next/server";
import { providerRegistry } from "@/lib/notifications/registry";
import { MockEmailProvider } from "@/lib/notifications/providers/email.provider";

describe("Logout Redirection & Contact Notification Flow", () => {
  let mockEmail: MockEmailProvider;

  beforeEach(() => {
    mockEmail = new MockEmailProvider();
    providerRegistry.setEmailProvider(mockEmail);
  });

  it("1. Logout GET redirects to /signup with status 303", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "GET",
    });

    const res = await logoutGet(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/signup");
  });

  it("2. Logout POST (form submission) redirects to /signup with status 303", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    const res = await logoutPost(req);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/signup");
  });

  it("3. Contact API dispatches inquiry to rohitkumar725801@gmail.com", async () => {
    const req = new NextRequest("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Aman Verma",
        email: "aman.verma@example.com",
        phone: "+91 98765 00000",
        subject: "Ayurvedic Treatment Inquiry",
        message: "I want to inquire about Panchakarma appointment slots.",
      }),
    });

    const res = await contactPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify email was received by rohitkumar725801@gmail.com
    const adminEmail = mockEmail.sentEmails.find(
      (e) => e.to === "rohitkumar725801@gmail.com"
    );
    expect(adminEmail).toBeDefined();
    expect(adminEmail?.subject).toContain("Aman Verma");
    expect(adminEmail?.html).toContain("Panchakarma appointment slots");
  });
});
