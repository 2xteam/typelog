"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { License } from "@/components/run/License";
import type { RunView } from "@/components/run/view";
import "@/components/run/result.css";
import "./start-license.css";

/** 홍보 시작 화면에서 보여 주는 자격증 미리보기. 결과 화면과 같은 License 시안을 쓴다. */
const PREVIEW: RunView = {
  attemptId: "start-running-record-000001",
  attemptNo: 1,
  code: "cert-3",
  detail: {
    version: "preview",
    gender: "f",
    distance: "10k",
    km: 10,
    seconds: 3150,
    paceSec: 315,
    kmh: 11.4,
    percentile: 12,
    percentileLabel: null,
    modifier: null,
    wanted: null,
  },
  name: "당신의 이름",
  race: "",
  completedAt: new Date("2026-11-21T09:00:00+09:00"),
  photo: null,
  issuer: "마이재인",
};

function ScaledCard() {
  const outer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: 620 });

  useLayoutEffect(() => {
    const measure = () => {
      const width = outer.current?.clientWidth ?? 1000;
      const scale = Math.min(1, width / 1000);
      setBox({ scale, height: 620 * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outer.current) observer.observe(outer.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className="sl-card-frame" style={{ height: box.height }}>
      <div className="sl-card-inner" style={{ transform: `scale(${box.scale})` }}>
        <License v={PREVIEW} />
      </div>
    </div>
  );
}

export function StartLicense({ children }: { children: React.ReactNode }) {
  return (
    <div className="sl-page">
      <div className="sl-shell">
        <p className="sl-eyebrow">RUNNING LICENSE · TYPELOG</p>
        <h1 className="sl-hook">
          나의 러닝,
          <br />
          <em>몇 급일까요?</em> 🏅
        </h1>
        <p className="sl-sub">기록을 입력하면 나만의 러닝 자격증을 발급해 드려요</p>
        <div className="sl-card-wrap">
          <ScaledCard />
        </div>
        <p className="sl-note">🏃 기록 하나로 나의 러닝 급수를 확인해 보세요</p>
        {children}
      </div>
    </div>
  );
}
