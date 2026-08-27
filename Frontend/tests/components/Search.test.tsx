import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Search from "../../src/components/Search";

const { authState, selectedMock } = vi.hoisted(() => ({
	authState: {
		isAuthenticated: false,
		user: { username: "", permission: null as "ADMIN" | "AGENT" | null, jwt: "" },
	},
	selectedMock: vi.fn(),
}));

vi.mock("../../src/hooks/useAuth.tsx", () => ({
	useAuth: () => authState,
}));

beforeEach(() => {
	authState.isAuthenticated = false;
	authState.user = { username: "", permission: null, jwt: "" };
	selectedMock.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("Search", () => {
	it("is disabled and makes no request while unauthenticated", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		render(<Search onCustomerSelected={selectedMock} />);

		expect((screen.getByLabelText("Customer ID search") as HTMLInputElement).disabled).toBe(true);
		expect((screen.getByRole("button", { name: "Search" }) as HTMLButtonElement).disabled).toBe(true);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fetches IDs with the token and shows sorted, limited suggestions", async () => {
		authState.isAuthenticated = true;
		authState.user = { username: "agent1", permission: "AGENT", jwt: "token" };
		const ids = ["CUS-9999", "CUS-0003", "CUS-0001", "CUS-0002", "OTHER-1"];
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ids });
		vi.stubGlobal("fetch", fetchMock);
		render(<Search onCustomerSelected={selectedMock} />);

		// The correlation id is a fresh UUID per request, so we assert that one
		// was sent rather than pinning a value that changes every run.
		await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/customers", {
			headers: {
				Authorization: "Bearer token",
				"X-Correlation-Id": expect.any(String),
			},
		}));
		fireEvent.change(screen.getByLabelText("Customer ID search"), { target: { value: " cus-0 " } });

		expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
			"Search", "CUS-0001", "CUS-0002", "CUS-0003",
		]);
	});

	it("selects a suggestion and normalizes a valid Enter search", async () => {
		authState.isAuthenticated = true;
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ["CUS-1234"] });
		vi.stubGlobal("fetch", fetchMock);
		render(<Search onCustomerSelected={selectedMock} />);
		await waitFor(() => expect(fetchMock).toHaveBeenCalled());

		const input = screen.getByLabelText("Customer ID search");
		fireEvent.change(input, { target: { value: "cus-12" } });
		fireEvent.click(screen.getByRole("button", { name: "CUS-1234" }));
		expect(selectedMock).toHaveBeenLastCalledWith("CUS-1234");
		expect((input as HTMLInputElement).value).toBe("CUS-1234");
		expect(screen.queryByRole("button", { name: "CUS-1234" })).toBeNull();

		fireEvent.change(input, { target: { value: " cus-1234 " } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(selectedMock).toHaveBeenLastCalledWith("CUS-1234");
	});

	it("shows a validation error for invalid searches and ignores other keys", async () => {
		authState.isAuthenticated = true;
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
		render(<Search onCustomerSelected={selectedMock} />);
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		const input = screen.getByLabelText("Customer ID search");

		fireEvent.keyDown(input, { key: "Tab" });
		expect(screen.queryByText("Customer ID must look like CUS-1234.")).toBeNull();
		fireEvent.change(input, { target: { value: "bad-id" } });
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		expect(screen.getByText("Customer ID must look like CUS-1234.")).toBeTruthy();
		expect(selectedMock).not.toHaveBeenCalled();
	});

	it("logs and recovers from an API failure", async () => {
		authState.isAuthenticated = true;
		const error = new Error("network down");
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
		render(<Search onCustomerSelected={selectedMock} />);

		await waitFor(() => expect(console.error).toHaveBeenCalledWith(error));
	});

	it("handles a non-OK API response", async () => {
		authState.isAuthenticated = true;
		const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		render(<Search onCustomerSelected={selectedMock} />);

		await waitFor(() => expect(console.error).toHaveBeenCalled());
		expect(consoleErrorMock.mock.calls[0][0]).toBeInstanceOf(Error);
		expect((consoleErrorMock.mock.calls[0][0] as Error).message).toBe(
			"Failed to load customer IDs."
		);
	});

	it("clears suggestions when the query becomes empty", async () => {
		authState.isAuthenticated = true;
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["CUS-1234"] }));
		render(<Search onCustomerSelected={selectedMock} />);
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		const input = screen.getByLabelText("Customer ID search");

		fireEvent.change(input, { target: { value: "CUS" } });
		expect(screen.getByRole("button", { name: "CUS-1234" })).toBeTruthy();
		fireEvent.change(input, { target: { value: "" } });
		expect(screen.queryByRole("button", { name: "CUS-1234" })).toBeNull();
	});

	it("ignores an ID response after the search is unmounted", async () => {
		authState.isAuthenticated = true;
		let resolveFetch!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((resolve) => {
			resolveFetch = resolve;
		})));
		const { unmount } = render(<Search onCustomerSelected={selectedMock} />);
		unmount();
		resolveFetch({ ok: true, json: async () => ["CUS-1234"] });
		await Promise.resolve();
	});

	it("ignores an ID error after the search is unmounted", async () => {
		authState.isAuthenticated = true;
		let rejectFetch!: (reason: unknown) => void;
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise((_, reject) => {
			rejectFetch = reject;
		})));
		const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});
		const { unmount } = render(<Search onCustomerSelected={selectedMock} />);
		unmount();
		rejectFetch(new Error("late failure"));
		await Promise.resolve();
		expect(consoleErrorMock).not.toHaveBeenCalled();
	});

	it("clears the field, suggestions, and error when authentication is removed", async () => {
		authState.isAuthenticated = true;
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["CUS-1234"] }));
		const view = render(<Search onCustomerSelected={selectedMock} />);
		await waitFor(() => expect(fetch).toHaveBeenCalled());
		const input = screen.getByLabelText("Customer ID search");
		fireEvent.change(input, { target: { value: "bad" } });
		fireEvent.click(screen.getByRole("button", { name: "Search" }));
		expect(screen.getByText("Customer ID must look like CUS-1234.")).toBeTruthy();

		authState.isAuthenticated = false;
		view.rerender(<Search onCustomerSelected={selectedMock} />);
		expect((screen.getByLabelText("Customer ID search") as HTMLInputElement).value).toBe("");
		expect(screen.queryByText("Customer ID must look like CUS-1234.")).toBeNull();
	});
});