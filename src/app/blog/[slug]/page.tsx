import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts } from "@/lib/blog-posts";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="mt-8 mb-3 font-heading text-lg font-semibold tracking-tight"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <p key={i} className="mt-4 text-sm font-semibold text-foreground">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith("**") && line.includes("**:")) {
      const boldEnd = line.indexOf("**:");
      const bold = line.slice(2, boldEnd);
      const rest = line.slice(boldEnd + 3);
      elements.push(
        <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">{bold}</strong>:{rest}
        </p>
      );
    } else if (line.startsWith("- **")) {
      const boldEnd = line.indexOf("**", 4);
      const bold = line.slice(4, boldEnd);
      const rest = line.slice(boldEnd + 2);
      elements.push(
        <li key={i} className="ml-4 mt-1 text-sm leading-relaxed text-muted-foreground list-disc">
          <strong className="font-semibold text-foreground">{bold}</strong>{rest}
        </li>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 mt-1 text-sm leading-relaxed text-muted-foreground list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={i} className="ml-4 mt-1 text-sm leading-relaxed text-muted-foreground list-decimal">
          {text}
        </li>
      );
    } else if (line.trim() === "") {
      // skip blank lines
    } else {
      elements.push(
        <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {line}
        </p>
      );
    }
    i++;
  }

  return elements;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to blog
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
            {post.category}
          </span>
          <span className="tabular-nums">
            {new Date(post.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span>&middot;</span>
          <span>{post.readTime}</span>
        </div>
        <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          By {post.author}
        </p>
      </header>

      <div>{renderMarkdown(post.content)}</div>

      <div className="mt-12 border-t border-border pt-8">
        <p className="text-sm font-semibold text-foreground">
          Find commercial projects before your competitors.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          PermitPulse monitors building permits daily across 5 major metros and
          delivers trade-filtered leads with GC contact info.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/permits"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            Browse Permits
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted"
          >
            View Plans
          </Link>
        </div>
      </div>
    </article>
  );
}
