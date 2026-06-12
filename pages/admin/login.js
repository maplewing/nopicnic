import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Incorrect password.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Admin — No Picnic Press</title>
      </Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>NPP</div>
          <h1 style={styles.heading}>Admin</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

AdminLogin.noLayout = true;

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    padding: "40px 48px",
    width: "100%",
    maxWidth: "360px",
    textAlign: "center",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#888",
    marginBottom: "24px",
    textTransform: "uppercase",
  },
  heading: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "28px",
    color: "#111",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ccc",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  error: {
    marginTop: "8px",
    fontSize: "13px",
    color: "#c00",
    textAlign: "left",
  },
  button: {
    marginTop: "16px",
    display: "block",
    width: "100%",
    padding: "11px",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.06em",
    background: "#111",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "uppercase",
  },
};
