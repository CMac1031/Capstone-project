import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "../../src/components/Login";
import {
	createMockJwtExpiringIn,
} from "../MockJWT";

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock("../../src/hooks/useAuth", () => ({
	useAuth: () => ({ login: loginMock }),
}));

beforeEach(() => {
	loginMock.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

// "Log in" appears twice on screen -- once as the tab, once as the submit
// button -- so tests select the submit button specifically by its class
// rather than by accessible name, which is ambiguous.
function submitButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".login-screen-submit") as HTMLButtonElement;
}

describe("Login", () => {
	it("renders the login form by default, with the Log in tab active", () => {
		const { container } = render(<Login />);

		expect(screen.getByLabelText("Username")).toBeTruthy();
		expect(screen.getByLabelText("Password")).toBeTruthy();
		expect(submitButton(container).textContent).toBe("Log in");
	});

	it("switches to the Create account tab and back", () => {
		const { container } = render(<Login />);

		fireEvent.click(screen.getByRole("button", { name: "Create account" }));
		expect(submitButton(container).textContent).toBe("Request account");

		const tabs = container.querySelectorAll(".login-screen-tab");
		fireEvent.click(tabs[0]); // the "Log in" tab
		expect(submitButton(container).textContent).toBe("Log in");
	});

	it("submits credentials, and passes the response to auth", async () => {
		const jwt = createMockJwtExpiringIn(3600);
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ permission: "ADMIN", jwt }),
		});
		vi.stubGlobal("fetch", fetchMock);
		const { container } = render(<Login />);

		fireEvent.change(screen.getByLabelText("Username"), {
			target: { value: "admin1" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "secret" },
		});
		fireEvent.click(submitButton(container));

		await waitFor(() => expect(loginMock).toHaveBeenCalledWith(
			"admin1",
			"ADMIN",
			jwt
		));
		expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username: "admin1", password: "secret" }),
		});
	});

	it("shows the server error, clears the password, and keeps the username", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		const { container } = render(<Login />);

		fireEvent.change(screen.getByLabelText("Username"), {
			target: { value: "admin1" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrong" },
		});
		fireEvent.click(submitButton(container));

		await waitFor(() => expect(screen.getByText(
			"Invalid username or password."
		)).toBeTruthy());
		expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe(
			"admin1"
		);
		expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
	});

	it("uses the fallback message when fetch rejects with a non-Error", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));
		const { container } = render(<Login />);

		fireEvent.click(submitButton(container));

		await waitFor(() => expect(screen.getByText(
			"Login failed. Please try again."
		)).toBeTruthy());
	});

	it("shows a busy state while the request is pending", async () => {
		let resolveFetch!: (response: { ok: boolean; json: () => Promise<unknown> }) => void;
		const pendingFetch = new Promise<{ ok: boolean; json: () => Promise<unknown> }>(
			(resolve) => {
				resolveFetch = resolve;
			}
		);
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(pendingFetch));
		const { container } = render(<Login />);

		fireEvent.click(submitButton(container));
		expect((screen.getByRole("button", { name: "Logging in..." }) as HTMLButtonElement).disabled).toBe(true);

		resolveFetch({ ok: false, json: async () => ({}) });
		await waitFor(() => expect(screen.getByText(
			"Invalid username or password."
		)).toBeTruthy());
	});
});