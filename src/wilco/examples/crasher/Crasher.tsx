interface CrasherProps {
  shouldCrash?: boolean;
  errorMessage?: string;
}

export default function Crasher({
  shouldCrash = true,
  errorMessage = "This is an intentional error for testing!",
}: CrasherProps) {
  if (shouldCrash) {
    throw new Error(errorMessage);
  }

  return (
    <div style={{ padding: "1rem", border: "1px solid #4a4", borderRadius: "8px", background: "#1a2a1a" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", color: "#8f8" }}>No Crash!</h3>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Toggle "Should Crash" to true to see the error boundary in action.
      </p>
    </div>
  );
}
