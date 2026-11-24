// path: apps/web/src/app/not-found.tsx
// purpose: The 404 page. Also what anyone sees at /admin without being a signed-in admin.
export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 text-center">
      <div>
        <p className="text-6xl font-bold text-violet">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page doesn’t exist</h1>
        <p className="mt-2 text-mute">The page you’re looking for isn’t here.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-semibold text-white">Back to GhostDesk</a>
      </div>
    </main>
  );
}
