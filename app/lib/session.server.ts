import { createCookieSessionStorage } from "react-router";

// 세션 스토리지 설정
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30일
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default-secret-key"],
    secure: process.env.NODE_ENV === "production",
  },
});

// 세션 헬퍼 함수들
export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<string | undefined> {
  const session = await getSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    return undefined;
  }
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw new Response(null, {
      status: 302,
      headers: {
        Location: `/admin/login?${searchParams}`,
      },
    });
  }
  return userId;
}

export async function createUserSession(
  userId: string,
  redirectTo: string
) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin/login",
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// 관리자 인증 함수
export async function verifyLogin(email: string, password: string) {
  // 환경변수에서 관리자 이메일 목록 가져오기
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  
  if (!adminEmails.includes(email)) {
    return null;
  }
  
  // 원래 프로젝트의 관리자 계정 정보 확인
  if (email === "cccc@cccc.or.kr" && password === "ansghk2025@$") {
    return {
      id: "admin-1",
      email: email,
      name: "춘천문화원 관리자"
    };
  }
  
  return null;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return null;
  }
  
  // 간단한 사용자 정보 반환 (실제로는 데이터베이스에서 조회)
  return {
    id: userId,
    email: "cccc@cccc.or.kr",
    name: "춘천문화원 관리자"
  };
}