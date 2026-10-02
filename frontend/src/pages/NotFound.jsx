import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 text-center max-w-sm">
        <h1 className="text-4xl font-extrabold text-slate-300">404</h1>
        <p className="text-slate-500 mt-2">Page not found.</p>
        <Link to="/" className="btn-blue mt-4">Go home</Link>
      </div>
    </div>
  );
}
