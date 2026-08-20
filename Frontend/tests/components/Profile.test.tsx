import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Profile from "../../src/components/Profile";
import type Customer from "../../src/types/Customer";

const { authState } = vi.hoisted(() => ({
	authState: {
		isAdmin: false,
		user: { email: "agent@example.com", permission: "AGENT" as "ADMIN" | "AGENT", jwt: "token" },
	},
}));

vi.mock("../../src/hooks/useAuth.tsx", () => ({
	useAuth: () => authState,
}));

const customer: Customer = {
	customerId: "CUS-1234",
	name: "Amina Khan",
	email: "amina@example.com",
	phone: "800-123-4567",
	accountStatus: "ACTIVE",
};

const updatedCustomer: Customer = {
	...customer,
	name: "Updated Name",
	email: "updated@example.com",
	phone: "555-0100",
	accountStatus: "SUSPENDED",
};

beforeEach(() => {
	authState.isAdmin = false;
	authState.user = { email: "agent@example.com", permission: "AGENT", jwt: "token" };
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function mockCustomerFetch(response: unknown = customer) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => response,
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("Profile", () => {
	it("renders nothing and makes no request without a customer ID", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { container } = render(<Profile customerId="" />);

		expect(container.firstChild).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("shows a loading state while the customer request is pending", () => {
		let resolveFetch!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((resolve) => {
			resolveFetch = resolve;
		})));

		render(<Profile customerId="CUS-1234" />);
		expect(screen.getByText("Loading customer...")).toBeTruthy();

		resolveFetch({ ok: true, json: async () => customer });
	});

	it("loads a customer with the authorization token and hides editing for agents", async () => {
		const fetchMock = mockCustomerFetch();

		render(<Profile customerId="CUS-1234" />);
		await waitFor(() => expect(screen.getByText("Amina Khan")).toBeTruthy());

		expect(fetchMock).toHaveBeenCalledWith("/api/customers/CUS-1234", {
			headers: { Authorization: "Bearer token" },
		});
		expect(screen.getByText("ACTIVE")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
	});

	it("shows an Error message when loading fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

		render(<Profile customerId="CUS-404" />);
		await waitFor(() => expect(screen.getByText("Customer not found.")).toBeTruthy());
	});

	it("uses the fallback message for a non-Error loading failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));

		render(<Profile customerId="CUS-404" />);
		await waitFor(() => expect(screen.getByText("Failed to load customer.")).toBeTruthy());
	});

	it("allows an admin to edit, cancel, and save all fields", async () => {
		authState.isAdmin = true;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => customer })
			.mockResolvedValueOnce({ ok: true, json: async () => updatedCustomer });
		vi.stubGlobal("fetch", fetchMock);
		render(<Profile customerId="CUS-1234" />);
		await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy());

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
		fireEvent.change(inputs[0], { target: { value: "Draft Name" } });
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(screen.getByText("Amina Khan")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		const editInputs = screen.getAllByRole("textbox") as HTMLInputElement[];
		fireEvent.change(editInputs[0], { target: { value: updatedCustomer.name } });
		fireEvent.change(editInputs[1], { target: { value: updatedCustomer.email } });
		fireEvent.change(editInputs[2], { target: { value: updatedCustomer.phone } });
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "SUSPENDED" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		expect(fetchMock).toHaveBeenLastCalledWith("/api/customers/CUS-1234", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: "Bearer token",
			},
			body: JSON.stringify({
				name: updatedCustomer.name,
				email: updatedCustomer.email,
				phone: updatedCustomer.phone,
				accountStatus: updatedCustomer.accountStatus,
			}),
		});
		await waitFor(() => expect(screen.getByText("Updated Name")).toBeTruthy());
		expect(screen.getByText("SUSPENDED")).toBeTruthy();
});

	it("shows Saving while a save is pending", async () => {
		authState.isAdmin = true;
		let resolveSave!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => customer })
			.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
		vi.stubGlobal("fetch", fetchMock);

		render(<Profile customerId="CUS-1234" />);
		await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy());
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(screen.getByRole("button", { name: "Saving..." })).toBeTruthy();
		expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
		resolveSave({ ok: true, json: async () => updatedCustomer });
		await waitFor(() => expect(screen.getByText("Updated Name")).toBeTruthy());
	});

	it("shows the Error message when saving fails", async () => {
		authState.isAdmin = true;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => customer })
			.mockResolvedValueOnce({ ok: false });
		vi.stubGlobal("fetch", fetchMock);

		render(<Profile customerId="CUS-1234" />);
		await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy());
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(screen.getByText("Failed to save changes.")).toBeTruthy());
	});

	it("uses the fallback message for a non-Error save failure", async () => {
		authState.isAdmin = true;
		const fetchMock = vi.fn()
			.mockResolvedValueOnce({ ok: true, json: async () => customer })
			.mockRejectedValueOnce("offline");
		vi.stubGlobal("fetch", fetchMock);

		render(<Profile customerId="CUS-1234" />);
		await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy());
		fireEvent.click(screen.getByRole("button", { name: "Edit" }));
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(screen.getByText("Failed to save changes.")).toBeTruthy());
	});

	it("ignores a response after the profile is unmounted", async () => {
		let resolveFetch!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((resolve) => {
			resolveFetch = resolve;
		})));
		const { unmount } = render(<Profile customerId="CUS-1234" />);
		unmount();
		resolveFetch({ ok: true, json: async () => customer });
		await Promise.resolve();
	});

	it("ignores a loading error after the profile is unmounted", async () => {
		let rejectFetch!: (reason: unknown) => void;
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((_, reject) => {
			rejectFetch = reject;
		})));
		const { unmount } = render(<Profile customerId="CUS-1234" />);
		unmount();
		rejectFetch(new Error("late failure"));
		await Promise.resolve();
	});
});
