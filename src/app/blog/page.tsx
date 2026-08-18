import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog-posts";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips and guides for subcontractors on finding commercial construction projects, using building permit data, and winning more bids.",
  openGraph: {
    title: "Blog | PermitPulse",
    description:
      "Tips and guides for subcontractors on finding commercial construction projects using building permit data.",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Resources
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Blog
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Guides for subcontractors on finding commercial projects, reading
          permit data, and building a steady lead pipeline.
        </p>
      </div>

      <div className="divide-y divide-border">
        {posts.map((post) => (
          <article key={post.slug} className="py-6 first:pt-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                {post.category}
              </span>
              <span className="tabular-nums">
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>&middot;</span>
              <span>{post.readTime}</span>
            </div>
            <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight">
              <Link
                href={`/blog/${post.slug}`}
                className="transition-colors duration-200 hover:text-primary"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {post.description}
            </p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary/80"
            >
              Read more
              <ArrowRight className="h-3 w-3" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
