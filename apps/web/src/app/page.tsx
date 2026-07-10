"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Trash2, BarChart3, Shield, Key, Mail, Check, LogOut, ArrowRight, Activity, Calendar, Globe, Monitor } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random(),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";

      stars.forEach((star) => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60 pointer-events-none" />;
};

const getDomainBrand = (url: string, shortCode?: string): string => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname; // e.g. "onlinecourses.nptel.ac.in"

    if (hostname === "localhost") {
      if (shortCode && typeof window !== "undefined") {
        const savedBrand = localStorage.getItem(`brand:${shortCode}`);
        if (savedBrand) return savedBrand;
      }
      return "localhost";
    }

    const parts = hostname.split(".");
    if (parts.length <= 1) return hostname || "lnk";

    // Common double TLDs to correctly identify primary brands
    const doubleTlds = ["ac.in", "co.in", "org.in", "gov.in", "edu.in", "co.uk", "org.uk", "me.uk", "ltd.uk", "plc.uk", "sch.uk", "gov.uk", "ac.uk", "org.nz", "co.nz", "co.jp", "ne.jp"];
    const lastTwo = parts.slice(-2).join(".");

    if (doubleTlds.includes(lastTwo) && parts.length >= 3) {
      return parts[parts.length - 3];
    } else {
      return parts[parts.length - 2];
    }
  } catch {
    return "lnk";
  }
};

const API_BASE = "http://localhost:5005/api";
const REDIRECT_BASE = "http://localhost:5005";

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface ShortURL {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  createdAt: string;
}

interface AnalyticsRecord {
  id: string;
  clickedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

interface UrlAnalytics {
  id: string;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  analytics: AnalyticsRecord[];
}

export default function Home() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");

  // URL state
  const [originalUrl, setOriginalUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [urls, setUrls] = useState<ShortURL[]>([]);
  const [createdUrl, setCreatedUrl] = useState<ShortURL | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(false);
  const [shortenProgress, setShortenProgress] = useState(0);

  // Modal / Analytics state
  const [viewingAnalytics, setViewingAnalytics] = useState<UrlAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Load auth state from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    }
  }, []);

  // Fetch URLs when user or token changes
  useEffect(() => {
    if (token) {
      fetchUrls();
    } else {
      setUrls([]);
    }
  }, [token]);

  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();
      if (json.success) {
        setUser(json.data);
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  const fetchUrls = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/urls`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setUrls(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = isRegistering ? "register" : "login";

    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success) {
        const { token: authToken, user: userData } = json.data;
        localStorage.setItem("token", authToken);
        setToken(authToken);
        setUser(userData);
        setEmail("");
        setPassword("");
      } else {
        setAuthError(json.error || "Authentication failed");
      }
    } catch (e) {
      setAuthError("Network error. Is server running?");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setUrls([]);
  };

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreatedUrl(null);

    if (!originalUrl) {
      setError("Please enter a URL.");
      return;
    }

    let localhostBrand: string | null = null;
    try {
      const urlToTest = originalUrl.startsWith("http://") || originalUrl.startsWith("https://")
        ? originalUrl
        : `http://${originalUrl}`;
      const parsed = new URL(urlToTest);
      if (parsed.hostname === "localhost") {
        localhostBrand = prompt("Enter a custom domain name/brand to display for this localhost link:");
        if (localhostBrand === null) {
          // Cancel execution if user cancels the prompt
          return;
        }
      }
    } catch {
      // Let server validation handle malformed URLs
    }

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    setIsShortening(true);
    setShortenProgress(0);

    const progressInterval = setInterval(() => {
      setShortenProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 80);

    try {
      const res = await fetch(`${API_BASE}/urls`, {
        method: "POST",
        headers,
        body: JSON.stringify({ originalUrl, customCode }),
      });
      const json = await res.json();

      clearInterval(progressInterval);
      setShortenProgress(100);

      setTimeout(() => {
        setIsShortening(false);
        setShortenProgress(0);
      }, 300);

      if (json.success) {
        if (localhostBrand && typeof window !== "undefined") {
          localStorage.setItem(`brand:${json.data.shortCode}`, localhostBrand);
        }
        setCreatedUrl(json.data);
        setOriginalUrl("");
        setCustomCode("");
        if (token) {
          fetchUrls();
        }
      } else {
        setError(json.error || "Failed to shorten URL");
      }
    } catch (e) {
      clearInterval(progressInterval);
      setIsShortening(false);
      setShortenProgress(0);
      setError("Network error. Check server.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/urls/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        fetchUrls();
        if (viewingAnalytics?.id === id) {
          setViewingAnalytics(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewAnalytics = async (url: ShortURL) => {
    if (!token) return;
    setViewingAnalytics(null);
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/urls/${url.id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setViewingAnalytics(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-16 relative overflow-hidden">
      <StarField />
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#1a103d_0%,_transparent_50%)] opacity-50 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Navbar */}
        <header className="border-b border-slate-900/50 bg-slate-950/40 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg text-white">
              <Link2 className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              LinkCraft
            </span>
          </div>

          <div className="flex items-center gap-7">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>
                <Button onClick={logout} variant="outline" size="sm" className="border-slate-800 hover:bg-slate-900 text-slate-200">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Sign in  manage and view analytics</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Shortener and Auth */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Welcome / Branding Banner */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/40 via-indigo-950/20 to-slate-950 border border-blue-900/30 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full filter blur-3xl pointer-events-none" />
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Shorten Links. <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Track Analytics.</span>
            </h1>
            <p className="mt-4 text-slate-400 max-w-lg text-lg leading-relaxed">
              Create, share, and track secure custom shortened URLs. Clean interfaces, fast redirects, and detailed traffic analytics.
            </p>
          </div>

          {/* URL Shortener Card */}
          <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-slate-100">Create Short Link</CardTitle>
              <CardDescription className="text-slate-400">
                Paste your long URL below. Optional custom short code can be specified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleShorten} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="originalUrl" className="text-slate-300">Original URL</Label>
                  <div className="relative">
                    <Input
                      id="originalUrl"
                      placeholder="https://example.com/very-long-path-name"
                      value={originalUrl}
                      onChange={(e) => setOriginalUrl(e.target.value)}
                      className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 pl-10"
                    />
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customCode" className="text-slate-300">Custom Code (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm select-none">linkcraft/</span>
                    <Input
                      id="customCode"
                      placeholder="my-promo"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                {isShortening && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>Generating short link...</span>
                      <span>{shortenProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${shortenProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isShortening} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {isShortening ? "Creating Link..." : "Shorten Link"}
                  {!isShortening && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              {/* Show newly created URL */}
              {createdUrl && (
                <div className="mt-6 p-4 rounded-xl bg-blue-950/40 border border-blue-950 text-slate-200">
                  <p className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Success! Short link created:</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <a
                      href={`${REDIRECT_BASE}/${createdUrl.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-bold text-white hover:underline truncate"
                    >
                      {getDomainBrand(createdUrl.originalUrl, createdUrl.shortCode)}/{createdUrl.shortCode}
                    </a>
                    <Button
                      onClick={() => copyToClipboard(`${REDIRECT_BASE}/${createdUrl.shortCode}`, "new-url")}
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      {copiedId === "new-url" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">Original: {createdUrl.originalUrl}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Auth or User Dashboard */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {!user ? (
            /* Authentication Panel */
            <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
              <CardHeader>
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={() => { setIsRegistering(false); setAuthError(""); }}
                    variant={!isRegistering ? "default" : "ghost"}
                    className={!isRegistering ? "bg-slate-800 hover:bg-slate-800 text-white" : "text-slate-400"}
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => { setIsRegistering(true); setAuthError(""); }}
                    variant={isRegistering ? "default" : "ghost"}
                    className={isRegistering ? "bg-slate-800 hover:bg-slate-800 text-white" : "text-slate-400"}
                  >
                    Register
                  </Button>
                </div>
                <CardTitle className="text-slate-100">{isRegistering ? "Create an Account" : "Access Dashboard"}</CardTitle>
                <CardDescription className="text-slate-400">
                  {isRegistering
                    ? "Register to save custom short URLs and view live usage analytics."
                    : "Log in to view metrics, modify links, and access your personal dashboard."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 pl-10"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:ring-blue-500 focus:border-blue-500 pl-10"
                      />
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {authError && <p className="text-sm text-red-400">{authError}</p>}

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    {isRegistering ? "Register Account" : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Authenticated Links List */
            <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-100">Your Short Links</CardTitle>
                  <CardDescription className="text-slate-400">Manage links and view performance.</CardDescription>
                </div>
                <Button size="icon" variant="ghost" onClick={fetchUrls} className="text-slate-400 hover:text-white">
                  <Activity className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {urls.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-900 rounded-xl">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm">You haven't shortened any links yet.</p>
                  </div>
                ) : (
                  urls.map((url) => (
                    <div key={url.id} className="p-3 bg-slate-950/50 border border-slate-900 rounded-xl space-y-2 group">
                      <div className="flex items-center justify-between">
                        <a
                          href={`${REDIRECT_BASE}/${url.shortCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-white hover:underline truncate max-w-[200px]"
                        >
                          {getDomainBrand(url.originalUrl, url.shortCode)}/{url.shortCode}
                        </a>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={() => copyToClipboard(`${REDIRECT_BASE}/${url.shortCode}`, url.id)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-white"
                          >
                            {copiedId === url.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button
                            onClick={() => handleViewAnalytics(url)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-blue-400"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(url.id)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{url.originalUrl}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-950/80">
                        <span>Clicks: <strong className="text-blue-400">{url.clicks}</strong></span>
                        <span>{new Date(url.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Analytics Slide-over / Modal */}
      {viewingAnalytics && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-slate-800 bg-slate-900 text-slate-100 max-h-[85vh] flex flex-col">
            <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Analytics: {getDomainBrand(viewingAnalytics.originalUrl, viewingAnalytics.shortCode)}/{viewingAnalytics.shortCode}</CardTitle>
                <CardDescription className="text-slate-400 truncate max-w-md">
                  Original: {viewingAnalytics.originalUrl}
                </CardDescription>
              </div>
              <Button onClick={() => setViewingAnalytics(null)} variant="outline" className="border-slate-800 hover:bg-slate-800 text-slate-200">
                Close
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Clicks</p>
                  <p className="text-3xl font-bold text-blue-500 mt-1">{viewingAnalytics.clicks}</p>
                </div>
                <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Unique Referrers</p>
                  <p className="text-3xl font-bold text-indigo-500 mt-1">
                    {new Set(viewingAnalytics.analytics.map((a) => a.referer).filter(Boolean)).size}
                  </p>
                </div>
              </div>

              {/* Click list */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Recent Activity (Latest 100 clicks)
                </h3>
                {viewingAnalytics.analytics.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center bg-slate-950/20 border border-slate-800 rounded-xl">
                    No clicks recorded yet. Share the shortened link to start collecting statistics!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {viewingAnalytics.analytics.map((click) => (
                      <div key={click.id} className="p-3 bg-slate-950/30 border border-slate-900 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Globe className="w-3.5 h-3.5 text-slate-500" />
                            <span>Referrer: {click.referer || "Direct Traffic"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <Monitor className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[300px]" title={click.userAgent || undefined}>
                              Browser: {click.userAgent ? click.userAgent.substring(0, 50) + "..." : "Unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <div>IP: {click.ipAddress || "Unknown"}</div>
                          <div>{new Date(click.clickedAt).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
