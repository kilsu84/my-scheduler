import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, newPassword, masterKey } = await req.json();

    if (!masterKey || masterKey !== process.env.BETTER_AUTH_SECRET) {
      return NextResponse.json(
        { error: "마스터 키(BETTER_AUTH_SECRET)가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    if (!email || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "이메일과 8자 이상의 새 비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    const ctx = await auth.$context;
    const found = await ctx.internalAdapter.findUserByEmail(email);

    if (!found) {
      return NextResponse.json(
        { error: "해당 이메일로 가입된 계정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const hashedPassword = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(found.user.id, hashedPassword);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
