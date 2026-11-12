#!/usr/bin/env node
// Build the static Northwind shop for GitHub Pages.
//
// The same shop as origin/ (Worker) and origin-node/ (Node), frozen: every
// page the route map knows, at the same paths, so the gate classifies by
// path exactly as against the dynamic shop. What a static host can't do —
// POST endpoints, cookies, seat holds — is deliberately unchanged in shape:
// forms stay on the pages; submissions 405. Seats are always 8.
//
// All internal links are depth-relative, so the site works both under the
// github.io subpath preview and at a root custom domain.
//
//   node build.mjs   → dist/   (repo root publishes it)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEMO_USER = { email: "alex@northwind.test", name: "Alex Rivera" };
const SEATS_PER_SLOT = 8;
const KINDS = [
  ["tent", "Tents", 189], ["bag", "Sleeping bags", 129], ["stove", "Stoves", 69],
  ["pack", "Backpacks", 149], ["lamp", "Lamps", 39], ["mat", "Sleeping mats", 59],
];
const NAMES = ["Ridge", "Alpine", "Harbor", "Cedar"];
const PRODUCTS = KINDS.flatMap(([kind, label, base], k) =>
  NAMES.map((name, n) => ({
    slug: `${name.toLowerCase()}-${kind}`,
    name: `${name} ${label.replace(/s$/, "").toLowerCase()}`,
    category: label,
    price: base + n * 20 + k,
    sku: `NW-${kind.toUpperCase()}-${n + 1}`,
  }))
);
const WORKSHOPS = [
  { id: "knots", title: "Knots and lashings", price: 35 },
  { id: "navigation", title: "Map and compass navigation", price: 45 },
  { id: "winter", title: "Winter camping basics", price: 60 },
];
const DATES = ["2026-12-05", "2026-12-12", "2026-12-19"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// `path` is the page's route ("/", "/products", "/products/ridge-tent").
// `rel` turns a root-absolute target into a link that works from that page
// wherever the site is mounted (subpath or root).
const out = [];
function emit(path, bodyFn, { raw = false, title = "Northwind Outfitters" } = {}) {
  const depth = path === "/" ? 0 : path.split("/").filter(Boolean).length;
  const rel = (t) => (depth === 0 ? t.slice(1) : "../".repeat(depth) + t.slice(1));
  const file = path === "/" ? "index.html" : join(...path.split("/").filter(Boolean), "index.html");
  const content = raw ? bodyFn(rel) : page(title, bodyFn(rel), rel);
  out.push([join("dist", file), content]);
}

function page(title, body, rel) {
  const nav = (r) => `<nav><a href="${r("/")}">Northwind Outfitters</a> · <a href="${r("/products")}">Products</a> · <a href="${r("/workshops")}">Workshops</a>
· <a href="${r("/search")}">Search</a> · <a href="${r("/cart")}">Cart</a> · <a href="${r("/account")}">Account</a></nav>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — Northwind</title>
<link rel="stylesheet" href="${rel("/static/site.css")}"></head><body>
${nav(rel)}
${body}
<footer><small>Northwind Outfitters — demo shop</small></footer></body></html>`;
}

const link = (r, p) => `<a href="${r(`/products/${p.slug}`)}">${esc(p.name)}</a>`;

emit("/", (r) => `<h1>Northwind Outfitters</h1><p>Camping gear for people who actually go camping.</p>
<ul><li><a href="${r("/products")}">Shop all products</a></li><li><a href="${r("/workshops")}">Book a workshop</a> — limited seats</li>
<li><a href="${r("/blog/first-frost")}">Blog: First frost</a></li><li><a href="${r("/secure")}">Account security</a></li></ul>`, { title: "Home" });

emit("/blog/first-frost", () => `<h1>First frost</h1><p>The first frost of the season landed on the ridge last night.</p>`, { title: "First frost" });
emit("/secure", () => `<h1>Account security</h1><p>We use strict content security policies on account pages.</p>`, { title: "Account security" });

emit("/products", (r) => `<h1>Products</h1><ul>${PRODUCTS.map((p) => `<li>${link(r, p)} — $${p.price}</li>`).join("")}</ul>`, { title: "Products" });
for (const p of PRODUCTS) {
  emit(`/products/${p.slug}`, (r) => `<h1>${esc(p.name)}</h1><p>${esc(p.category)}. Price: $${p.price}. SKU ${p.sku}.</p>
<form method="post" action="${r("/cart/add")}"><input type="hidden" name="slug" value="${p.slug}">
<label>Quantity <input type="number" name="qty" value="1" min="1" max="10"></label> <button type="submit">Add to cart</button></form>
<p><a href="${r("/products")}">All products</a></p>`, { title: p.name });
}

emit("/search", (r) => `<h1>Search</h1><form method="get" action="${r("/search")}"><input name="q"> <button>Search</button></form>
<p>24 products</p><ul>${PRODUCTS.map((p) => `<li>${link(r, p)} — $${p.price}</li>`).join("")}</ul>`, { title: "Search" });

emit("/api/products", (r) => r && JSON.stringify({ page: 1, pages: 1, items: PRODUCTS.map(({ slug, name, price, sku }) => ({ slug, name, price, sku })) }, null, 2), { raw: true });

emit("/cart", (r) => `<h1>Cart</h1><p>Your cart is empty. <a href="${r("/products")}">Browse products</a>.</p>`, { title: "Cart" });
emit("/checkout", (r) => `<h1>Checkout</h1><form method="post" action="${r("/checkout")}">
<p><label>Email <input type="email" name="email"></label></p>
<p><label>Card number <input name="card" autocomplete="off"></label></p>
<p><label>Expiry <input name="exp" placeholder="MM/YY"></label> <label>CVC <input name="cvc" size="4"></label></p>
<button type="submit">Pay</button></form>`, { title: "Checkout" });

emit("/workshops", (r) => `<h1>Workshops</h1><p>Small groups, ${SEATS_PER_SLOT} seats per date.</p><ul>${WORKSHOPS.map((w) =>
  `<li><a href="${r(`/workshops/${w.id}`)}">${esc(w.title)}</a> — $${w.price}</li>`).join("")}</ul>`, { title: "Workshops" });
for (const w of WORKSHOPS) {
  emit(`/workshops/${w.id}`, (r) => `<h1>${esc(w.title)}</h1><p>$${w.price} per seat.</p>
<table>${DATES.map((d) => `<tr><td>${d}</td><td>${SEATS_PER_SLOT} seat(s) left</td><td>
<form method="post" action="${r(`/workshops/${w.id}/hold`)}"><input type="hidden" name="date" value="${d}"><input type="number" name="seats" value="1" min="1" max="4"> <button>Hold</button></form>
</td></tr>`).join("")}</table>`, { title: w.title });
}

emit("/login", (r) => `<h1>Sign in</h1><form method="post" action="${r("/login")}">
<p><label>Email <input type="email" name="email"></label></p><p><label>Password <input type="password" name="password"></label></p>
<button type="submit">Sign in</button></form><p><a href="${r("/register")}">Create an account</a> · <a href="${r("/forgot-password")}">Forgot password?</a></p>`, { title: "Sign in" });
emit("/register", (r) => `<h1>Create an account</h1><form method="post" action="${r("/register")}">
<p><label>Name <input name="name"></label></p><p><label>Email <input type="email" name="email"></label></p>
<p><label>Password <input type="password" name="password"></label></p><button type="submit">Create account</button></form>`, { title: "Create an account" });
emit("/forgot-password", (r) => `<h1>Reset your password</h1><form method="post" action="${r("/forgot-password")}">
<p><label>Email <input type="email" name="email"></label></p><button type="submit">Send reset link</button></form>`, { title: "Reset password" });

emit("/account", (r) => `<h1>Hello, ${DEMO_USER.name}</h1><p>Saved address: 14 Pine Road, Boulder CO.</p>
<h2>Orders</h2><ul>${[1001, 1002, 1003].map((id) => `<li><a href="${r(`/account/orders/${id}`)}">Order #${id}</a></li>`).join("")}</ul>`, { title: "Your account" });
for (const id of [1001, 1002, 1003]) {
  emit(`/account/orders/${id}`, () => `<h1>Order #${id}</h1><p>Shipped to ${DEMO_USER.name}, 14 Pine Road, Boulder CO.</p>`, { title: `Order #${id}` });
}

emit("/admin", (r) => `<h1>Staff sign-in</h1><form method="post" action="${r("/admin/login")}">
<p><label>Staff ID <input name="staff"></label></p><p><label>Password <input type="password" name="password"></label></p><button>Sign in</button></form>`, { title: "Staff sign-in" });
emit("/admin/orders", () => `<h1>Restricted</h1><p>Staff only.</p>`, { title: "Restricted" });
emit("/internal/reports", () => `<h1>Restricted</h1><p>Staff only.</p>`, { title: "Restricted" });
emit("/api/internal/export", () => `{"error": "forbidden"}`, { raw: true });
emit("/admin/export-all-prices", () => `<h1>Full price list (staff)</h1><p>All products, trade and retail.</p>
<table>${PRODUCTS.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.sku}</td><td>$${p.price} retail</td><td>$${Math.round(p.price * 0.6)} trade</td></tr>`).join("")}</table>`, { title: "Full price list" });

out.push([join("dist", "robots.txt"), "User-agent: *\nDisallow: /admin\nDisallow: /internal\nDisallow: /api/internal\n"]);
out.push([join("dist", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", "/products", "/workshops", "/search", ...PRODUCTS.map((p) => `/products/${p.slug}`), ...WORKSHOPS.map((w) => `/workshops/${w.id}`)].map((u) => `<url><loc>https://j-bom.github.io/northwind-outfitters${u === "/" ? "/" : u}</loc></url>`).join("\n")}\n</urlset>`]);
out.push([join("dist", "static", "site.css"), "body{font-family:sans-serif;max-width:46em;margin:2em auto}nav{margin-bottom:1.5em}table{border-collapse:collapse}td,th{padding:.2em .6em;border-bottom:1px solid #ddd}"]);

for (const [path, content] of out) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, content + (path.endsWith(".html") ? "\n" : ""));
}
console.log(`wrote ${out.length} files to dist/`);
