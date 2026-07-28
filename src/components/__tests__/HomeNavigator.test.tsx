import { act, fireEvent, render, screen } from "@testing-library/react";
import { HomeNavigator } from "../home-navigator";
import { haptics } from "../../lib/haptics";

let mockReducedMotion = false;

jest.mock("framer-motion", () => {
  const ReactModule =
    jest.requireActual<typeof import("react")>("react");
  const createMotionComponent = (tag: string) =>
    ReactModule.forwardRef<
      HTMLElement,
      Record<string, unknown> & {
        children?: import("react").ReactNode;
      }
    >((props, ref) => {
      const domProps = { ...props };
      const { children } = domProps;
      delete domProps.initial;
      delete domProps.animate;
      delete domProps.exit;
      delete domProps.transition;
      delete domProps.whileTap;
      return ReactModule.createElement(tag, { ...domProps, ref }, children);
    });

  return {
    AnimatePresence: ({
      children,
    }: {
      children: import("react").ReactNode;
    }) => children,
    motion: {
      button: createMotionComponent("button"),
      img: createMotionComponent("img"),
      p: createMotionComponent("p"),
    },
    useReducedMotion: () => mockReducedMotion,
  };
});

jest.mock("../../lib/haptics", () => ({
  haptics: {
    light: jest.fn(),
    success: jest.fn(),
  },
}));

describe("HomeNavigator", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion = false;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("rotates messages every six seconds", () => {
    render(<HomeNavigator mode="normal" onOpenLearning={jest.fn()} />);

    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "取引前30秒の記録",
    );

    act(() => {
      jest.advanceTimersByTime(6_000);
    });

    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "見送りも立派な記録",
    );
  });

  it("shows playful reactions on the third and sixth taps", () => {
    render(<HomeNavigator mode="normal" onOpenLearning={jest.fn()} />);
    const mascot = screen.getByTestId("home-navigator-mascot");

    fireEvent.click(mascot);
    fireEvent.click(mascot);
    fireEvent.click(mascot);

    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "くすぐったいな",
    );

    fireEvent.click(mascot);
    fireEvent.click(mascot);
    fireEvent.click(mascot);

    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "ちょっと恥ずかしいな",
    );
    expect(haptics.light).toHaveBeenCalledTimes(6);
  });

  it("resets the tap counter after eight seconds", () => {
    render(<HomeNavigator mode="normal" onOpenLearning={jest.fn()} />);
    const mascot = screen.getByTestId("home-navigator-mascot");

    fireEvent.click(mascot);
    fireEvent.click(mascot);

    act(() => {
      jest.advanceTimersByTime(8_001);
    });

    fireEvent.click(mascot);

    expect(screen.getByTestId("home-navigator-message")).not.toHaveTextContent(
      "くすぐったいな",
    );
  });

  it("stops automatic rotation for reduced motion but keeps manual switching", () => {
    mockReducedMotion = true;
    render(<HomeNavigator mode="normal" onOpenLearning={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(12_000);
    });
    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "取引前30秒の記録",
    );

    fireEvent.click(screen.getByTestId("home-navigator-mascot"));
    expect(screen.getByTestId("home-navigator-message")).toHaveTextContent(
      "見送りも立派な記録",
    );
  });
});
