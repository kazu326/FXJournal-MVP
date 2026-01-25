"use client";

import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MessageCircle, Send } from "lucide-react";

interface TeacherDMCardProps {
  timestamp?: string;
  message?: string;
  onSendReply?: (message: string) => void;
}

export function TeacherDMCard({
  timestamp = "2026/1/20 22:06",
  message = "記録ありがとうございます。取引後のチェック（Step2）が未完のようです。\n\n結果ではなく「想定内/外」の判定だけでOKなので、1分で仕上げてください。",
  onSendReply,
}: TeacherDMCardProps) {
  const [reply, setReply] = useState("");

  const handleSend = () => {
    if (reply.trim() && onSendReply) {
      onSendReply(reply);
      setReply("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="bg-accent border-accent">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="size-5 text-accent-foreground" />
          <h2 className="text-lg font-semibold text-accent-foreground">先生からのDM</h2>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">AI</span>
          </div>
          <span className="text-sm text-accent-foreground/70">{timestamp}</span>
        </div>

        <div className="mb-4">
          {message.split("\n").map((line, index) => (
            <p
              key={index}
              className="text-accent-foreground leading-relaxed"
              style={{ lineHeight: "1.6em" }}
            >
              {line || <br />}
            </p>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="返信を入力..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button onClick={handleSend} disabled={!reply.trim()} className="px-4">
            <Send className="size-4" />
            <span className="sr-only">送信</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
