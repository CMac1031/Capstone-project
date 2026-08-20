import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";

const { authState } = vi.hoisted(() => ({
	authState: { isAuthenticated: false },
}));

vi.mock("../src/hooks/useAuth", () => ({
	useAuth: () => authState,
}));

vi.mock("../src/components/Navbar", () => ({
	default: () => <div data-testid="navbar">Navbar</div>,
}));

vi.mock("../src/components/Search", () => ({
	default: ({ onCustomerSelected }: { onCustomerSelected: (id: string) => void }) => (
		<button type="button" onClick={() => onCustomerSelected("CUS-1234")}>
			Select customer
		</button>
	),
}));

vi.mock("../src/components/Profile", () => ({
	default: ({ customerId }: { customerId: string }) => (
		<div data-testid="profile">Profile: {customerId}</div>
	),
}));

beforeEach(() => {
	authState.isAuthenticated = false;
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("App", () => {
	it("renders the navbar and search without a profile initially", () => {
		render(<App />);

		expect(screen.getByTestId("navbar")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Select customer" })).toBeTruthy();
		expect(screen.queryByTestId("profile")).toBeNull();
		expect(document.querySelector(".app-shell")?.className).toBe("app-shell ");
	});

	it("shows the selected profile and split layout", () => {
		render(<App />);

		fireEvent.click(screen.getByRole("button", { name: "Select customer" }));

		expect(screen.getByTestId("profile").textContent).toBe("Profile: CUS-1234");
		expect(document.querySelector(".app-shell")?.className).toBe("app-shell app-shell--split");
	});

	it("clears the selected profile when authentication is lost", () => {
		authState.isAuthenticated = true;
		const view = render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Select customer" }));
		expect(screen.getByTestId("profile")).toBeTruthy();

		authState.isAuthenticated = false;
		view.rerender(<App />);

		expect(screen.queryByTestId("profile")).toBeNull();
		expect(document.querySelector(".app-shell")?.className).toBe("app-shell ");
	});
});
