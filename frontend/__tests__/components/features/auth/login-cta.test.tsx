import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { LoginCTA } from "#/components/features/auth/login-cta";

// Mock useTracking hook
const mockTrackSaasSelfhostedInquiry = vi.fn();
vi.mock("#/hooks/use-tracking", () => ({
  useTracking: () => ({
    trackSaasSelfhostedInquiry: mockTrackSaasSelfhostedInquiry,
  }),
}));

describe("LoginCTA", () => {
  const mockWindowOpen = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("open", mockWindowOpen);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should render enterprise CTA with title and description", () => {
    render(<LoginCTA />);

    expect(screen.getByTestId("login-cta")).toBeInTheDocument();
    expect(screen.getByText("CTA$ENTERPRISE")).toBeInTheDocument();
    expect(screen.getByText("CTA$ENTERPRISE_DEPLOY")).toBeInTheDocument();
  });

  it("should render all enterprise feature list items", () => {
    render(<LoginCTA />);

    expect(screen.getByText("CTA$FEATURE_ON_PREMISES")).toBeInTheDocument();
    expect(screen.getByText("CTA$FEATURE_DATA_CONTROL")).toBeInTheDocument();
    expect(screen.getByText("CTA$FEATURE_COMPLIANCE")).toBeInTheDocument();
    expect(screen.getByText("CTA$FEATURE_SUPPORT")).toBeInTheDocument();
  });

  it("should open enterprise page in new tab when Learn More button is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginCTA />);

    const learnMoreButton = screen.getByRole("button", {
      name: "CTA$LEARN_MORE",
    });
    await user.click(learnMoreButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://openhands.dev/enterprise/",
      "_blank",
      "noopener",
    );
  });

  it("should call trackSaasSelfhostedInquiry with location 'login_page' when Learn More is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginCTA />);

    const learnMoreButton = screen.getByRole("button", {
      name: "CTA$LEARN_MORE",
    });
    await user.click(learnMoreButton);

    expect(mockTrackSaasSelfhostedInquiry).toHaveBeenCalledWith({
      location: "login_page",
    });
  });
});
