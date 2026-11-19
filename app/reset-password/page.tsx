"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, masterKey, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "비밀번호 변경에 실패했습니다.");
      } else {
        setMessage("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
        setNewPassword("");
      }
    } catch {
      setIsError(true);
      setMessage("서버와 통신하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf8f5] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-2">비밀번호 초기화</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Vercel의 BETTER_AUTH_SECRET 값을 마스터 키로 입력하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="가입한 이메일 주소"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              마스터 키 (BETTER_AUTH_SECRET)
            </label>
            <input
              type="password"
              required
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              placeholder="Vercel 환경 변수 값 붙여넣기"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">새 비밀번호</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상 입력"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                isError ? "text-red-600" : "text-green-600 font-medium"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#14213d] text-white py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "변경 중..." : "비밀번호 변경하기"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/sign-in" className="underline font-medium text-black">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
