import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
  await screen.findByText(
    "ブレイク後、今の価格はまだ狙える位置ですか？（価格位置）",
  );
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

    fireEvent.change(
      screen.getByPlaceholderText("確認したことや迷った点を短く残せます"),
      {
        target: { value: "H4条件が不成立" },
      },
    );
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
      screen.queryByText(
        "ブレイク後、今の価格はまだ狙える位置ですか？（価格位置）",
      ),
    ).not.toBeInTheDocument();
  });

  test("shows beginner Gate copy and learning aids only on Q3 and Q4", async () => {
    renderPage();

    expect(screen.getByText("4時間足の上昇トレンド")).toBeInTheDocument();
    expect(
      screen.getByText("4時間足は上昇トレンドですか？（ダウ理論）"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "高値・安値の切り上げなどを見て、4時間足が上昇トレンドと言えるか確認します。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("参考画像を見る")).not.toBeInTheDocument();
    expect(screen.getByTestId("attention-answer-yes")).toHaveTextContent("はい");
    expect(screen.getByTestId("attention-answer-no")).toHaveTextContent(
      "いいえ",
    );
    expect(screen.getByTestId("attention-answer-unknown")).toHaveTextContent(
      "わからない",
    );
    expect(screen.getByText("気づいたこと（任意）")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("attention-answer-yes"));
    expect(screen.getByText("相場環境の確認")).toBeInTheDocument();
    expect(
      screen.getByText(
        "今は通常どおりチャート判断を続けられる相場ですか？",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "明らかな現金化（cash-out）や、指標直後の異常な値動きがある場合はNOです。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("参考画像を見る")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("attention-answer-yes"));
    expect(screen.getByText("押し目のレンジ・持ち合い")).toBeInTheDocument();
    expect(
      screen.getByText(
        "押し目の中で、レンジや持ち合いができてきていますか？",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "形の名前そのものより、流れの中で値動きがまとまってきているかを確認します。",
      ),
    ).toBeInTheDocument();

    const q3Aid = screen.getByTestId("attention-learning-aid-pa_shrink");
    const q3Details = within(q3Aid)
      .getByText("参考画像を見る")
      .closest("details");
    expect(q3Details).not.toHaveAttribute("open");
    const q3Image = within(q3Aid).getByAltText(
      "上昇トレンドからレンジ、下抜け、全戻し、押し戻し、収束へ進む参考図",
    );
    expect(q3Image).not.toBeVisible();
    const q3Video = within(q3Aid).getByRole("link", {
      name: "講師の解説動画を見る（6:50〜）",
    });
    expect(q3Video).toHaveAttribute(
      "href",
      "https://youtu.be/-YSI9VNhS8o?si=iQqYdbj5lp8aBSAx&t=410",
    );
    expect(q3Video).toHaveAttribute("target", "_blank");
    expect(q3Video).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.click(within(q3Aid).getByText("参考画像を見る"));
    expect(q3Details).toHaveAttribute("open");
    expect(q3Image).toBeVisible();

    fireEvent.click(screen.getByTestId("attention-answer-yes"));
    expect(screen.getByText("ブレイク確認")).toBeInTheDocument();
    expect(
      screen.getByText(
        "ここまでの条件がそろった上で、持ち合いを上に抜けましたか？（ブレイク確認）",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("持ち合い・収束を上に抜けたかを確認します。"),
    ).toBeInTheDocument();

    const q4Aid = screen.getByTestId(
      "attention-learning-aid-breakout_confirmed",
    );
    const q4Details = within(q4Aid)
      .getByText("参考画像を見る")
      .closest("details");
    expect(q4Details).not.toHaveAttribute("open");
    const q4Image = within(q4Aid).getByAltText(
      "三角持ち合いから上方向へブレイクする参考図",
    );
    expect(q4Image).not.toBeVisible();
    expect(within(q4Aid).getByRole("link")).toHaveAttribute(
      "href",
      "https://youtu.be/-YSI9VNhS8o?si=iQqYdbj5lp8aBSAx&t=410",
    );
    fireEvent.click(within(q4Aid).getByText("参考画像を見る"));
    expect(q4Details).toHaveAttribute("open");
    expect(q4Image).toBeVisible();

    fireEvent.click(screen.getByTestId("attention-answer-yes"));
    await screen.findByText(
      "ブレイク後、今の価格はまだ狙える位置ですか？（価格位置）",
    );
    expect(screen.queryByText("参考画像を見る")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "講師の解説動画を見る（6:50〜）",
      }),
    ).not.toBeInTheDocument();
  });

  test("shows all Judgment questions in the existing order with new copy", async () => {
    renderPage();
    await passGate();

    const questions = [
      {
        number: "①",
        title: "ブレイク後の価格位置",
        prompt: "ブレイク後、今の価格はまだ狙える位置ですか？（価格位置）",
        guidance:
          "すでに大きく伸びた後ではないか、追いかける位置になっていないかを確認します。",
      },
      {
        number: "③",
        title: "底堅さ・押し目の質",
        prompt: "押し目は底堅く見えますか？（底堅さ・押し目の質）",
        guidance:
          "下ヒゲや安値の切り上げなど、下げ止まっている材料があるか確認します。",
      },
      {
        number: "②",
        title: "押し戻し・再テスト",
        prompt: "ブレイク後の押し戻しで、形が崩れていませんか？（再テスト）",
        guidance: "ブレイクした根拠がまだ保たれているかを確認します。",
      },
      {
        number: "⑥",
        title: "下位足との整合",
        prompt:
          "下位足の値動きは、4時間足の方向と大きく矛盾していませんか？（下位足PA）",
        guidance:
          "短期の値動きが、上位足の方向に強く逆らっていないか確認します。",
      },
      {
        number: "④",
        title: "利確の置き方",
        prompt: "利確の置き方は、今の相場に合っていますか？",
        guidance:
          "取れそうな値幅や、近くの高値・抵抗帯を見て確認します。",
      },
      {
        number: "⑤",
        title: "ボラティリティ",
        prompt:
          "今の値動きは、ポジションを考えられる範囲ですか？（ボラティリティ）",
        guidance:
          "値動きが荒れすぎていたり、急激に拡大していないか確認します。",
      },
      {
        number: "⑦",
        title: "損切り・リスク・無効化条件",
        prompt:
          "入る前に、損切り位置・許容リスク・判断が崩れる条件を言えますか？",
        guidance:
          "どこで間違いと判断するかを、ポジションを考える前に確認します。",
      },
    ];

    for (const [index, question] of questions.entries()) {
      expect(screen.getByText(question.number)).toBeInTheDocument();
      expect(screen.getByText(question.title)).toBeInTheDocument();
      expect(screen.getByText(question.prompt)).toBeInTheDocument();
      expect(screen.getByText(question.guidance)).toBeInTheDocument();
      expect(screen.queryByText("参考画像を見る")).not.toBeInTheDocument();
      if (index < questions.length - 1) {
        fireEvent.click(screen.getByTestId("attention-answer-yes"));
      }
    }
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
      screen.getByText(
        "今の値動きは、ポジションを考えられる範囲ですか？（ボラティリティ）",
      ),
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
