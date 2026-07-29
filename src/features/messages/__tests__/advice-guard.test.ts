import { assessOutboundMessage } from "../advice-guard";

describe("assessOutboundMessage", () => {
  it("allows habit-focused educational guidance", () => {
    expect(
      assessOutboundMessage(
        "損失を取り返したくなったときは、一度画面を閉じて深呼吸し、記録を読み返してみましょう。",
      ),
    ).toEqual({ allowed: true, reason: null });
  });

  it("blocks a recommendation to trade now", () => {
    expect(
      assessOutboundMessage("ドル円は今買いエントリーしてください。").allowed,
    ).toBe(false);
  });

  it("blocks a specific position size recommendation", () => {
    expect(
      assessOutboundMessage("今回は2ロットで取引するのがおすすめです。").allowed,
    ).toBe(false);
  });

  it("blocks a specific exit level recommendation", () => {
    expect(
      assessOutboundMessage("損切りは150.25円に設定しましょう。").allowed,
    ).toBe(false);
  });

  it("allows a general explanation of loss aversion", () => {
    expect(
      assessOutboundMessage(
        "損失回避は、損を取り返そうとして判断を急ぎやすくなる心理傾向です。",
      ).allowed,
    ).toBe(true);
  });
});
