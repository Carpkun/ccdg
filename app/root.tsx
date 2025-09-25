import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { getUser, isAdmin } from "./lib/auth.server";

// HeaderWrapper 컴포넌트 - 사용자 데이터를 Header에 전달
function HeaderWrapper() {
  const loaderData = useLoaderData<typeof loader>();
  const location = useLocation();
  
  // 관리자 페이지에서는 헤더 숨김
  const isAdminPage = location.pathname.startsWith('/admin');
  
  if (isAdminPage) {
    return null;
  }
  
  // loaderData가 없을 때 기본값 사용
  const user = loaderData?.user || null;
  const isAdmin = loaderData?.isAdmin || false;
  
  return <Header user={user} isAdmin={isAdmin} />;
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&Noto+Sans+KR:wght@100;200;300;400;500;600;700;800;900&display=swap",
  },
];

export const meta: Route.MetaFunction = () => {
  return [
    { title: "춘천답기 웹진 | 춘천문화원 회원 창작물 아카이브" },
    {
      name: "description",
      content: "춘천문화원 회원들의 수필, 한시, 사진, 서화, 영상 등 다양한 창작물을 디지털로 보존하고 공유하는 웹진입니다.",
    },
    { name: "keywords", content: "춘천답기,춘천문화원,웹진,디지털아카이브,수필,한시,사진,서화,영상" },
    { property: "og:title", content: "춘천답기 웹진" },
    { property: "og:description", content: "춘천문화원 회원들의 창작물 디지털 아카이브" },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "ko_KR" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "index,follow" },
  ];
};

export async function loader({ request }: { request: Request }) {
  try {
    const user = await getUser(request);
    const userIsAdmin = user ? await isAdmin(request) : false;
    
    return {
      user,
      isAdmin: userIsAdmin
    };
  } catch (error) {
    // 인증 오류가 발생해도 페이지는 정상적으로 렌더링
    return {
      user: null,
      isAdmin: false
    };
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// 조건부 레이아웃 컴포넌트
function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  
  if (isAdminPage) {
    // 관리자 페이지는 헤더/푸터 없이 전체 화면 사용
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }
  
  // 일반 페이지는 헤더/푸터 포함
  return (
    <>
      <HeaderWrapper />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const loaderData = useLoaderData<typeof loader>();
  const user = loaderData?.user || null;
  const isAdmin = loaderData?.isAdmin || false;
  return <Outlet context={{ user, isAdmin }} />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
