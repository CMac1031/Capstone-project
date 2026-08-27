import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Navbar from "../../src/components/Navbar";

const { authState, logoutMock } = vi.hoisted(() => ({
	authState: {
		user: { username: "", permission: null as "ADMIN" | "AGENT" | null, jwt: "" },
	},
	logoutMock: vi.fn(),
}));

vi.mock("../../src/hooks/useAuth", () => ({
	useAuth: () => ({ ...authState, logout: logoutMock }),
}));

vi.mock("../../src/components/Login", () => ({
	default: () => <div data-testid="login-component">Login component</div>,
}));

vi.mock("../../src/components/Account", () => ({
	default: () => <div data-testid="account-component">Account component</div>,
}));

beforeEach(() => {
	authState.user = { username: "", permission: null, jwt: "" };
	logoutMock.mockReset();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("Navbar", () => {
	it("renders the logo and Login for a guest user", () => {
		render(<Navbar />);

		expect(screen.getByRole("heading", { name: "Pretty Nice Code CRM" })).toBeTruthy();
		expect(screen.getByTestId("login-component")).toBeTruthy();
		expect(screen.queryByTestId("account-component")).toBeNull();
	});

	it("renders Logout and Account for an authenticated user", () => {
		authState.user = { username: "admin1", permission: "ADMIN", jwt: "jwt" };
		render(<Navbar />);

		expect(screen.getByRole("button", { name: "Logout" })).toBeTruthy();
		expect(screen.getByTestId("account-component")).toBeTruthy();
		expect(screen.queryByTestId("login-component")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Logout" }));
		expect(logoutMock).toHaveBeenCalledTimes(1);
	});
});
