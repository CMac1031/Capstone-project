/**
 * AgentJourney.test.tsx — integration
 *
 * Unlike App.test.tsx, which mocks Navbar, Search, Profile and useAuth to test
 * layout logic in isolation, this file mocks NOTHING but `fetch`. The real
 * AuthProvider, the real components and the real state flow between them are
 * all exercised together.
 *
 * That means it catches a class of bug the component tests structurally
 * cannot: a token issued by Login not reaching Profile, a logout that clears
 * one component but not another, a customer id that Search normalises into a
 * shape Profile can't fetch.
 *
 * The flow mirrors the demo script: log in, search, open a customer, edit,
 * save, log out.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { AuthProvider } from "../../src/hooks/useAuth";
import { createMockJwtExpiringIn } from "../MockJWT";
import type Customer from "../../src/types/Customer";

const customer: Customer = {
    customerId: "CUS-1001",
    name: "Amina Khan",
    email: "amina.khan@example.com",
    phone: "800-123-4567",
    accountStatus: "ACTIVE",
};

const suspendedCustomer: Customer = {
    ...customer,
    accountStatus: "SUSPENDED",
};

interface FetchCall {
    url: string;
    init?: RequestInit;
}

/**
 * A single fetch mock that routes by URL and method, standing in for the whole
 * backend. Returning realistic shapes per endpoint is what lets the components
 * talk to each other for real.
 */
function mockBackend(permission: "ADMIN" | "AGENT") {
    const calls: FetchCall[] = [];
    const jwt = createMockJwtExpiringIn(3600);

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });

        if (url === "/api/auth/login") {
            return { ok: true, json: async () => ({ permission, jwt }) };
        }
        if (url === "/api/customers") {
            return { ok: true, json: async () => ["CUS-1001", "CUS-1002"] };
        }
        if (url === "/api/customers/CUS-1001") {
            return init?.method === "PATCH"
                ? { ok: true, json: async () => suspendedCustomer }
                : { ok: true, json: async () => customer };
        }
        throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
    return { calls, jwt };
}

function renderApp() {
    return render(
        <AuthProvider>
            <App />
        </AuthProvider>
    );
}

async function logIn(username: string) {
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    fireEvent.change(screen.getByLabelText("Username"), {
        target: { value: username },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
    });
    fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

    // The modal closing and Logout appearing is the signal that the token
    // actually reached the auth context.
    await waitFor(() =>
        expect(screen.getByRole("button", { name: "Logout" })).toBeTruthy()
    );
}

async function openCustomer(customerId: string) {
    fireEvent.change(screen.getByLabelText("Customer ID search"), {
        target: { value: customerId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("Amina Khan")).toBeTruthy());
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("agent journey (integration)", () => {
    it("gates search behind authentication", () => {
        mockBackend("AGENT");
        renderApp();

        // The control is disabled before login, and no profile panel exists.
        expect(
            (screen.getByLabelText("Customer ID search") as HTMLInputElement).disabled
        ).toBe(true);
        expect(screen.queryByText("Amina Khan")).toBeNull();
    });

    it("logs in, searches, and opens a customer profile", async () => {
        const { calls } = mockBackend("AGENT");
        renderApp();

        await logIn("agent1");
        await openCustomer("CUS-1001");

        expect(screen.getByText("amina.khan@example.com")).toBeTruthy();
        expect(screen.getByText("ACTIVE")).toBeTruthy();

        // The token issued by Login has to have reached Profile's request.
        const profileCall = calls.find((c) => c.url === "/api/customers/CUS-1001");
        const headers = profileCall?.init?.headers as Record<string, string>;
        expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it("hides editing from an agent and shows it to an admin", async () => {
        mockBackend("AGENT");
        const view = renderApp();

        await logIn("agent1");
        await openCustomer("CUS-1001");
        expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();

        view.unmount();
        cleanup();
        vi.unstubAllGlobals();

        mockBackend("ADMIN");
        renderApp();

        await logIn("admin1");
        await openCustomer("CUS-1001");
        expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    });

    it("lets an admin edit and save, and reflects the saved value", async () => {
        const { calls } = mockBackend("ADMIN");
        renderApp();

        await logIn("admin1");
        await openCustomer("CUS-1001");

        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: "SUSPENDED" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(screen.getByText("SUSPENDED")).toBeTruthy());

        const patch = calls.find((c) => c.init?.method === "PATCH");
        expect(patch).toBeTruthy();
        expect(patch!.url).toBe("/api/customers/CUS-1001");
    });

    it("clears the profile and re-disables search on logout", async () => {
        mockBackend("ADMIN");
        renderApp();

        await logIn("admin1");
        await openCustomer("CUS-1001");

        fireEvent.click(screen.getByRole("button", { name: "Logout" }));

        // Logout has to reach three separate components: the navbar swaps back
        // to Login, App drops the selected customer, and Search resets itself.
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Login" })).toBeTruthy()
        );
        expect(screen.queryByText("Amina Khan")).toBeNull();
        expect(
            (screen.getByLabelText("Customer ID search") as HTMLInputElement).value
        ).toBe("");
        expect(
            (screen.getByLabelText("Customer ID search") as HTMLInputElement).disabled
        ).toBe(true);
    });

    it("sends a distinct correlation id on every request", async () => {
        const { calls } = mockBackend("ADMIN");
        renderApp();

        await logIn("admin1");
        await openCustomer("CUS-1001");

        const ids = calls.map(
            (c) => (c.init?.headers as Record<string, string>)["X-Correlation-Id"]
        );

        // Every call carries one...
        expect(ids.length).toBeGreaterThan(2);
        expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
        // ...and they are not all the same value, which is the whole point.
        expect(new Set(ids).size).toBe(ids.length);
    });
});