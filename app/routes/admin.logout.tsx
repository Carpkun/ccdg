import { redirect } from "react-router";
import { logout } from "../lib/session.server";

export async function action({ request }: { request: Request }) {
  return logout(request);
}

export async function loader({ request }: { request: Request }) {
  return logout(request);
}