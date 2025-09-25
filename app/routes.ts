import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/content/:id", "routes/content.$id.tsx"),
  route("/category/:slug", "routes/category.$slug.tsx"),
  route("/search", "routes/search.tsx"),
  route("/author/:id", "routes/author.$id.tsx"),
  
  // API 라우트
  route("/api/search", "routes/api.search.tsx"),
  route("/api/tts/cached", "routes/api.tts.cached.tsx"),
  
  // 정적 파일 라우트
  route("/tts/*", "routes/tts.$.tsx"),
  
  // 관리자 라우트
  route("/admin/login", "routes/admin.login.tsx"),
  route("/admin/logout", "routes/admin.logout.tsx"),
  route("/admin/dashboard", "routes/admin.dashboard.tsx"),
  route("/admin/authors", "routes/admin.authors.tsx"),
  route("/admin/comments", "routes/admin.comments.tsx"),
  route("/admin/contents", "routes/admin.contents.tsx"),
  route("/admin/contents/new", "routes/admin.contents.new.tsx"),
  route("/admin/contents/:id/edit", "routes/admin.contents.$id.edit.tsx"),
  route("/admin/media", "routes/admin.media.tsx"),
  route("/admin/upload", "routes/admin.upload.tsx"),
] satisfies RouteConfig;
