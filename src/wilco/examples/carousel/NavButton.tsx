interface NavButtonProps {
  direction: "prev" | "next";
  onClick: () => void;
}

export function NavButton({ direction, onClick }: NavButtonProps) {
  const isPrev = direction === "prev";

  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: isPrev ? "10px" : undefined,
        right: isPrev ? undefined : "10px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "rgba(0,0,0,0.5)",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        cursor: "pointer",
        fontSize: "18px",
      }}
    >
      {isPrev ? "‹" : "›"}
    </button>
  );
}
