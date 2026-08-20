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

function openLoginModal() {
	fireEvent.click(screen.getByRole("button", { name: "Login" }));
}

beforeEach(() => {
	loginMock.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("Login", () => {
	it("opens from a click and closes when the dimmed backdrop is clicked", () => {
		render(<Login />);

		openLoginModal();
		expect(screen.getByRole("dialog")).toBeTruthy();

		fireEvent.mouseDown(screen.getByRole("dialog"));
		expect(screen.getByRole("dialog")).toBeTruthy();

		fireEvent.mouseDown(document.querySelector(".login-overlay")!);
	});

	it("opens from Enter and Space on the login button", () => {
		render(<Login />);
		const loginButton = screen.getByRole("button", { name: "Login" });

		fireEvent.keyDown(loginButton, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();

		fireEvent.keyDown(loginButton, { key: "Enter" });
		expect(screen.getByRole("dialog")).toBeTruthy();

		fireEvent.mouseDown(document.querySelector(".login-overlay")!);
		fireEvent.keyDown(loginButton, { key: " " });
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("submits credentials, passes the response to auth, and closes", async () => {
		const jwt = createMockJwtExpiringIn(3600);
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ permission: "ADMIN", jwt }),
		});
		vi.stubGlobal("fetch", fetchMock);
		render(<Login />);
		openLoginModal();

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "admin@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "secret" },
		});
		fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

		await waitFor(() => expect(loginMock).toHaveBeenCalledWith(
			"admin@example.com",
			"ADMIN",
			jwt
		));
		expect(fetchMock).toHaveBeenCalledWith("/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "admin@example.com", password: "secret" }),
		});
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("shows the server error, clears the password, and keeps the email", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		render(<Login />);
		openLoginModal();

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "admin@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrong" },
		});
		fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

		await waitFor(() => expect(screen.getByText(
			"Invalid email or password."
		)).toBeTruthy());
		expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
			"admin@example.com"
		);
		expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
		expect(screen.getByRole("dialog")).toBeTruthy();
	});

	it("uses the fallback message when fetch rejects with a non-Error", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));
		render(<Login />);
		openLoginModal();

		fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);

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
		render(<Login />);
		openLoginModal();

		fireEvent.submit(screen.getByRole("dialog").querySelector("form")!);
		expect((screen.getByRole("button", { name: "Logging in..." }) as HTMLButtonElement).disabled).toBe(true);

		resolveFetch({ ok: false, json: async () => ({}) });
		await waitFor(() => expect(screen.getByText(
			"Invalid email or password."
		)).toBeTruthy());
	});
});
