import React, { useState, useEffect } from "react";

export default function LoadingDots({
  text = "Loading",
  speed = 500,
  maxDots = 3,
  className = "",
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < maxDots ? prev + "." : ""));
    }, speed);
    return () => clearInterval(interval);
  }, [speed, maxDots]);

  return (
    <div className={`flex items-center ${className}`}>
      {text}
      <span>{dots}</span>
    </div>
  );
}
