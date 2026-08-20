import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Account from "../../src/components/Account";

const { authState } = vi.hoisted(() => ({
	authState: {
		user: { email: "", permission: null as "ADMIN" | "AGENT" | null, jwt: "" },
	},
}));

vi.mock("../../src/hooks/useAuth", () => ({
	useAuth: () => authState,
}));

beforeEach(() => {
	authState.user = { email: "", permission: null, jwt: "" };
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("Account", () => {
	it("shows guest details and toggles with a click", () => {
		render(<Account />);
		const icon = screen.getByAltText("account");

		fireEvent.click(icon);
		expect(screen.getByRole("dialog", { name: "Account details" })).toBeTruthy();
		expect(screen.getByText("Not signed in")).toBeTruthy();
		expect(screen.getByText("Permission:").parentElement?.textContent).toContain("Guest");

		fireEvent.click(icon);
		expect(screen.queryByRole("dialog", { name: "Account details" })).toBeNull();
	});

	it("shows the signed-in user's email and permission", () => {
		authState.user = { email: "agent@example.com", permission: "AGENT", jwt: "jwt" };
		render(<Account />);

		fireEvent.click(screen.getByAltText("account"));
		expect(screen.getByText("agent@example.com")).toBeTruthy();
		expect(screen.getByText("Permission:").parentElement?.textContent).toContain("AGENT");
	});

	it("toggles with Enter and Space, ignores other keys, and closes on Escape", () => {
		render(<Account />);
		const icon = screen.getByAltText("account");

		fireEvent.keyDown(icon, { key: "Tab" });
		expect(screen.queryByRole("dialog", { name: "Account details" })).toBeNull();

		fireEvent.keyDown(icon, { key: "Enter" });
		expect(screen.getByRole("dialog", { name: "Account details" })).toBeTruthy();

		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("dialog", { name: "Account details" })).toBeNull();

		fireEvent.keyDown(icon, { key: " " });
		expect(screen.getByRole("dialog", { name: "Account details" })).toBeTruthy();
		fireEvent.keyDown(document, { key: "Escape" });
	});

	it("closes on an outside click but stays open for an inside click", () => {
		render(<Account />);
		fireEvent.click(screen.getByAltText("account"));

		fireEvent.mouseDown(screen.getByRole("dialog", { name: "Account details" }));
		expect(screen.getByRole("dialog", { name: "Account details" })).toBeTruthy();

		fireEvent.mouseDown(document.body);
		expect(screen.queryByRole("dialog", { name: "Account details" })).toBeNull();
	});

	it("removes document listeners when unmounted", () => {
		const addEventListenerSpy = vi.spyOn(document, "addEventListener");
		const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
		const { unmount } = render(<Account />);
		const mouseDownHandler = addEventListenerSpy.mock.calls.find(
			([eventName]) => eventName === "mousedown"
		)?.[1] as EventListener;

		unmount();
		mouseDownHandler(new MouseEvent("mousedown"));

		expect(removeEventListenerSpy.mock.calls.some(
			([eventName, handler]) => eventName === "mousedown" && typeof handler === "function"
		)).toBe(true);
		expect(removeEventListenerSpy.mock.calls.some(
			([eventName, handler]) => eventName === "keydown" && typeof handler === "function"
		)).toBe(true);
	});
});
