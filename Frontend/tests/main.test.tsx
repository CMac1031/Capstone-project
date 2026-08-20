import { afterEach, describe, expect, it, vi } from "vitest";

const { createRootMock, AuthProviderMock, AppMock } = vi.hoisted(() => ({
	createRootMock: vi.fn(() => ({ render: vi.fn() })),
	AuthProviderMock: vi.fn(({ children }: { children: unknown }) => children),
	AppMock: vi.fn(() => null),
}));

vi.mock("react-dom/client", () => ({
	createRoot: createRootMock,
}));

vi.mock("../src/hooks/useAuth.tsx", () => ({
	AuthProvider: AuthProviderMock,
}));

vi.mock("../src/App.tsx", () => ({
	default: AppMock,
}));

afterEach(() => {
	vi.resetModules();
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

describe("main entry point", () => {
	it("mounts App inside StrictMode and AuthProvider", async () => {
		document.body.innerHTML = '<div id="root"></div>';

		await import("../src/main.tsx");

		expect(createRootMock).toHaveBeenCalledWith(document.getElementById("root"));
		const rootElement = createRootMock.mock.results[0].value;
		expect(rootElement.render).toHaveBeenCalledTimes(1);

		const strictModeElement = rootElement.render.mock.calls[0][0];
		expect(strictModeElement.props.children.type).toBe(AuthProviderMock);
		expect(strictModeElement.props.children.props.children.type).toBe(AppMock);
	});
});
