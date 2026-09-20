import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CurrencyPair } from "../../../services/currencyPairService";
import { AttentionNavigatorPage } from "../AttentionNavigatorPage";
import {
  createAttentionSession,
  finishAttentionSession,
} from "../api";
import { useAttentionNavigatorStore } from "../store";

jest.mock("../api", () => ({
  createAttentionSession: jest.fn(),
  finishAttentionSession: jest.fn(),
}));

const pair: CurrencyPair = {
  id: "pair-xau-usd",
  symbol: "XAU/USD",
  base_currency: "XAU",
  quote_currency: "USD",
  pip_position: 2,
  contract_size: 100,
  min_lot: 0.01,
  is_active: true,
};

const mockedCreate = createAttentionSession as jest.MockedFunction<
  typeof createAttentionSession
>;
const mockedFinish = finishAttentionSession as jest.MockedFunction<
  typeof finishAttentionSession
>;

function renderPage(onStartTrade = jest.fn()) {
  render(
    <AttentionNavigatorPage
      userId="user-1"
      currencyPairs={[pair]}
      onBack={jest.fn()}
      onStartTrade={onStartTrade}
    />,
  );
  fireEvent.change(screen.getByLabelText("Attention 通貨ペア"), {
    target: { value: pair.id },
  });
  fireEvent.click(screen.getByTestId("attention-setup-start"));
  return onStartTrade;
}

async function passGate() {
  for (let index = 0; index < 4; index += 1) {
    fireEvent.click(screen.getByTestId("attention-answer-yes"));
  }
  await screen.findByText("ブレイク後の価格位置は許容範囲ですか？");
}

describe("AttentionNavigatorPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAttentionNavigatorStore.getState().resetWizard();
    useAttentionNavigatorStore.getState().setPendingTradeSessionId(null);
    mockedCreate.mockReset().mockResolvedValue("attention-session-1");
    mockedFinish.mockReset().mockResolvedValue(undefined);
  });

  test("stores an existing currency_pairs value and ends on STOP", async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText("確認した事実を短く残せます"), {
      target: { value: "H4条件が不成立" },
    });
    fireEvent.click(screen.getByTestId("attention-answer-no"));

    expect(await screen.findByTestId("attention-result")).toHaveTextContent(
      "STOP",
    );
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyPairId: "pair-xau-usd",
        symbol: "XAU/USD",
        gateResult: "stop",
        finishedAt: expect.any(String),
        gateAnswers: [
          expect.objectContaining({
            id: "playbook_target",
            answer: "no",
            reason: "H4条件が不成立",
            elapsed_ms: expect.any(Number),
          }),
        ],
      }),
    );
    expect(mockedFinish).not.toHaveBeenCalled();
  });

  test("stores unknown as HOLD without showing Judgment", async () => {
    renderPage();

    fireEvent.click(screen.getByTestId("attention-answer-unknown"));

    expect(await screen.findByTestId("attention-result")).toHaveTextContent(
      "HOLD",
    );
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ gateResult: "hold" }),
    );
    expect(
      screen.queryByText("ブレイク後の価格位置は許容範囲ですか？"),
    ).not.toBeInTheDocument();
  });

  test("shows Judgment only after all four Gate answers pass", async () => {
    renderPage();
    await passGate();

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        gateResult: "pass",
        finishedAt: null,
      }),
    );
    expect(screen.getByText("①")).toBeInTheDocument();
  });

  test("hard veto disables trade consideration", async () => {
    renderPage();
    await passGate();

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByTestId("attention-answer-yes"));
    }
    expect(
      screen.getByText("実際にポジションを検討できる程度のボラですか？"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("attention-answer-no"));

    expect(await screen.findByText("Hard veto STOP")).toBeInTheDocument();
    expect(screen.getByTestId("attention-decision-trade")).toBeDisabled();
  });

  test("trade consideration saves the decision and hands off the existing pair", async () => {
    const onStartTrade = renderPage(jest.fn());
    await passGate();

    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(screen.getByTestId("attention-answer-yes"));
    }
    fireEvent.click(screen.getByTestId("attention-decision-trade"));

    await waitFor(() => expect(mockedFinish).toHaveBeenCalledTimes(1));
    expect(mockedFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "attention-session-1",
        finalDecision: "consider_trade",
        hardVeto: false,
      }),
    );
    expect(onStartTrade).toHaveBeenCalledWith(pair, "attention-session-1");
  });
});
