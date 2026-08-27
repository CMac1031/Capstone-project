import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";

const { authState } = vi.hoisted(() => ({
	authState: { isAuthenticated: false },
}));

vi.mock("../src/hooks/useAuth", () => ({
	useAuth: () => authState,
}));

vi.mock("../src/components/Login", () => ({
	default: () => <div data-testid="login">Login</div>,
}));

vi.mock("../src/components/Sidebar", () => ({
	default: ({
				  activeView,
				  onNavigate,
			  }: {
		activeView: string;
		onNavigate: (view: "dashboard" | "profile" | "signup-requests") => void;
	}) => (
		<nav data-testid="sidebar" data-active={activeView}>
			<button type="button" onClick={() => onNavigate("dashboard")}>
				Customers
			</button>
			<button type="button" onClick={() => onNavigate("signup-requests")}>
				Signup requests
			</button>
		</nav>
	),
}));

vi.mock("../src/components/Dashboard", () => ({
	default: ({ onSelectCustomer }: { onSelectCustomer: (id: string) => void }) => (
		<button type="button" onClick={() => onSelectCustomer("CUS-1234")}>
			Select customer
		</button>
	),
}));

vi.mock("../src/components/Profile", () => ({
	default: ({ customerId, onBack }: { customerId: string; onBack: () => void }) => (
		<div data-testid="profile">
			Profile: {customerId}
			<button type="button" onClick={onBack}>
				Back
			</button>
		</div>
	),
}));

vi.mock("../src/components/AdminSignupRequests", () => ({
	default: () => <div data-testid="signup-requests">Signup requests</div>,
}));

beforeEach(() => {
	authState.isAuthenticated = false;
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("App", () => {
	it("renders the login screen when not authenticated", () => {
		render(<App />);

		expect(screen.getByTestId("login")).toBeTruthy();
		expect(screen.queryByTestId("sidebar")).toBeNull();
	});

	it("shows the sidebar and dashboard by default once authenticated", () => {
		authState.isAuthenticated = true;
		render(<App />);

		expect(screen.getByTestId("sidebar")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Select customer" })).toBeTruthy();
		expect(screen.queryByTestId("profile")).toBeNull();
	});

	it("opens the profile when a customer is selected, and returns to the dashboard via back", () => {
		authState.isAuthenticated = true;
		render(<App />);

		fireEvent.click(screen.getByRole("button", { name: "Select customer" }));
		expect(screen.getByTestId("profile").textContent).toBe("Profile: CUS-1234Back");

		fireEvent.click(screen.getByRole("button", { name: "Back" }));
		expect(screen.queryByTestId("profile")).toBeNull();
		expect(screen.getByRole("button", { name: "Select customer" })).toBeTruthy();
	});

	it("navigates to the signup requests screen via the sidebar", () => {
		authState.isAuthenticated = true;
		render(<App />);

		fireEvent.click(screen.getByRole("button", { name: "Signup requests" }));

		expect(screen.getByTestId("signup-requests")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Select customer" })).toBeNull();
	});

	it("returns to the login screen when authentication is lost", () => {
		authState.isAuthenticated = true;
		const view = render(<App />);
		fireEvent.click(screen.getByRole("button", { name: "Select customer" }));
		expect(screen.getByTestId("profile")).toBeTruthy();

		authState.isAuthenticated = false;
		view.rerender(<App />);

		expect(screen.getByTestId("login")).toBeTruthy();
		expect(screen.queryByTestId("profile")).toBeNull();
	});
});