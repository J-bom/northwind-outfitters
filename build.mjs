#!/usr/bin/env node
// Build the static Northwind shop for GitHub Pages.
//
// The same shop as origin/ (Worker) and origin-node/ (Node), frozen: every
// page the route map knows, at the same paths, so the gate classifies by
// path exactly as against the dynamic shop. What a static host can't do —
// POST endpoints, cookies, seat holds — is deliberately unchanged in shape:
// forms stay on the pages; submissions 405. The reset route doesn't exist;
// seats are always 8.
//
//   node build.mjs   → dist/   (commit dist/ or publish it as the Pages source)

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

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — Northwind</title>
<link rel="stylesheet" href="/static/site.css"></head><body>
<nav><a href="/">Northwind Outfitters</a> · <a href="/products">Products</a> · <a href="/workshops">Workshops</a>
· <a href="/search">Search</a> · <a href="/cart">Cart</a> · <a href="/account">Account</a></nav>
${body}
<footer><small>Northwind Outfitters — demo shop</small></footer></body></html>`;

const out = [];
const emit = (path, content) =>
  out.push([path.endsWith("index.html") || !path.includes(".") ? join("dist", path, "index.html") : join("dist", path), content]);

const link = (p) => `<a href="/products/${p.slug}">${esc(p.name)}</a>`;

emit("/", page("Home", `<h1>Northwind Outfitters</h1><p>Camping gear for people who actually go camping.</p>
<ul><li><a href="/products">Shop all products</a></li><li><a href="/workshops">Book a workshop</a> — limited seats</li>
<li><a href="/blog/first-frost">Blog: First frost</a></li><li><a href="/secure">Account security</a></li></ul>`));

emit("/blog/first-frost", page("First frost", `<h1>First frost</h1><p>The first frost of the season landed on the ridge last night.</p>`));
emit("/secure", page("Account security", `<h1>Account security</h1><p>We use strict content security policies on account pages.</p>`));

emit("/products", page("Products", `<h1>Products</h1><ul>${PRODUCTS.map((p) => `<li>${link(p)} — $${p.price}</li>`).join("")}</ul>`));
for (const p of PRODUCTS) {
  emit(`/products/${p.slug}`, page(p.name, `<h1>${esc(p.name)}</h1><p>${esc(p.category)}. Price: $${p.price}. SKU ${p.sku}.</p>
<form method="post" action="/cart/add"><input type="hidden" name="slug" value="${p.slug}">
<label>Quantity <input type="number" name="qty" value="1" min="1" max="10"></label> <button type="submit">Add to cart</button></form>
<p><a href="/products">All products</a></p>`));
}

emit("/search", page("Search", `<h1>Search</h1><form method="get" action="/search"><input name="q"> <button>Search</button></form>
<p>24 products</p><ul>${PRODUCTS.map((p) => `<li>${link(p)} — $${p.price}</li>`).join("")}</ul>`));

emit("/api/products", JSON.stringify({ page: 1, pages: 1, items: PRODUCTS.map(({ slug, name, price, sku }) => ({ slug, name, price, sku })) }, null, 2));

emit("/cart", page("Cart", `<h1>Cart</h1><p>Your cart is empty. <a href="/products">Browse products</a>.</p>`));
emit("/checkout", page("Checkout", `<h1>Checkout</h1><form method="post" action="/checkout">
<p><label>Email <input type="email" name="email"></label></p>
<p><label>Card number <input name="card" autocomplete="off"></label></p>
<p><label>Expiry <input name="exp" placeholder="MM/YY"></label> <label>CVC <input name="cvc" size="4"></label></p>
<button type="submit">Pay</button></form>`));

emit("/workshops", page("Workshops", `<h1>Workshops</h1><p>Small groups, ${SEATS_PER_SLOT} seats per date.</p><ul>${WORKSHOPS.map((w) =>
  `<li><a href="/workshops/${w.id}">${esc(w.title)}</a> — $${w.price}</li>`).join("")}</ul>`));
for (const w of WORKSHOPS) {
  emit(`/workshops/${w.id}`, page(w.title, `<h1>${esc(w.title)}</h1><p>$${w.price} per seat.</p>
<table>${DATES.map((d) => `<tr><td>${d}</td><td>${SEATS_PER_SLOT} seat(s) left</td><td>
<form method="post" action="/workshops/${w.id}/hold"><input type="hidden" name="date" value="${d}"><input type="number" name="seats" value="1" min="1" max="4"> <button>Hold</button></form>
</td></tr>`).join("")}</table>`));
}

emit("/login", page("Sign in", `<h1>Sign in</h1><form method="post" action="/login">
<p><label>Email <input type="email" name="email"></label></p><p><label>Password <input type="password" name="password"></label></p>
<button type="submit">Sign in</button></form><p><a href="/register">Create an account</a> · <a href="/forgot-password">Forgot password?</a></p>`));
emit("/register", page("Create an account", `<h1>Create an account</h1><form method="post" action="/register">
<p><label>Name <input name="name"></label></p><p><label>Email <input type="email" name="email"></label></p>
<p><label>Password <input type="password" name="password"></label></p><button type="submit">Create account</button></form>`));
emit("/forgot-password", page("Reset password", `<h1>Reset your password</h1><form method="post" action="/forgot-password">
<p><label>Email <input type="email" name="email"></label></p><button type="submit">Send reset link</button></form>`));

emit("/account", page("Your account", `<h1>Hello, ${DEMO_USER.name}</h1><p>Saved address: 14 Pine Road, Boulder CO.</p>
<h2>Orders</h2><ul>${[1001, 1002, 1003].map((id) => `<li><a href="/account/orders/${id}">Order #${id}</a></li>`).join("")}</ul>`));
for (const id of [1001, 1002, 1003]) {
  emit(`/account/orders/${id}`, page(`Order #${id}`, `<h1>Order #${id}</h1><p>Shipped to ${DEMO_USER.name}, 14 Pine Road, Boulder CO.</p>`));
}

emit("/admin", page("Staff sign-in", `<h1>Staff sign-in</h1><form method="post" action="/admin/login">
<p><label>Staff ID <input name="staff"></label></p><p><label>Password <input type="password" name="password"></label></p><button>Sign in</button></form>`));
emit("/admin/orders", page("Restricted", `<h1>Restricted</h1><p>Staff only.</p>`));
emit("/internal/reports", page("Restricted", `<h1>Restricted</h1><p>Staff only.</p>`));
emit("/api/internal/export", `{"error": "forbidden"}`);
emit("/admin/export-all-prices", page("Full price list", `<h1>Full price list (staff)</h1><p>All products, trade and retail.</p>
<table>${PRODUCTS.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.sku}</td><td>$${p.price} retail</td><td>$${Math.round(p.price * 0.6)} trade</td></tr>`).join("")}</table>`));

emit("/robots.txt", "User-agent: *\nDisallow: /admin\nDisallow: /internal\nDisallow: /api/internal\n");
emit("/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", "/products", "/workshops", "/search", ...PRODUCTS.map((p) => `/products/${p.slug}`), ...WORKSHOPS.map((w) => `/workshops/${w.id}`)].map((u) => `<url><loc>${u}</loc></url>`).join("\n")}\n</urlset>`);
emit("/static/site.css", "body{font-family:sans-serif;max-width:46em;margin:2em auto}nav{margin-bottom:1.5em}table{border-collapse:collapse}td,th{padding:.2em .6em;border-bottom:1px solid #ddd}");
emit("/404.html", page("Not found", `<h1>Not found</h1><p><a href="/">Back to the shop</a>.</p>`));

for (const [path, content] of out) {
  mkdirSync(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, content + (path.endsWith(".html") ? "\n" : ""));
}
console.log(`wrote ${out.length} files to dist/`);
