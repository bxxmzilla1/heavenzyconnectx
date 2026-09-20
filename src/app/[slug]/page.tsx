import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { describeError } from "@/lib/connect";
import { getConnection, getPageBySlug } from "@/lib/db";
import { hasPageAccess } from "@/lib/session";
import { RESERVED_SLUGS } from "@/lib/slug";
import type { ChannelOption } from "@/lib/supabase";
import { ConnectScreen } from "./ConnectScreen";
import { PasscodeGate } from "./PasscodeGate";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; u?: string; code?: string; c?: string };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = RESERVED_SLUGS.has(slug) ? null : await getPageBySlug(slug);
  return { title: page ? page.title : "Not found" };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  if (RESERVED_SLUGS.has(slug)) notFound();

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  if (page.passcode_hash && !(await hasPageAccess(page.id))) {
    return <PasscodeGate slug={page.slug} title={page.title} />;
  }

  // Resolve the initial screen state from the callback redirect params.
  let initial: Parameters<typeof ConnectScreen>[0]["initial"] = { kind: "idle" };
  if (sp.status === "connected") {
    initial = { kind: "connected", username: sp.u ?? "" };
  } else if (sp.status === "error") {
    initial = { kind: "error", message: describeError(sp.code ?? null) };
  } else if (sp.status === "choose" && sp.c) {
    const conn = await getConnection(sp.c);
    const channels: ChannelOption[] = conn && conn.page_id === page.id && conn.status === "needs_channel" ? conn.channels ?? [] : [];
    initial = channels.length > 0 ? { kind: "choose", connectionId: sp.c, channels } : { kind: "idle" };
  }

  return <ConnectScreen slug={page.slug} title={page.title} initial={initial} />;
}
