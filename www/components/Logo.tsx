import React from 'react';

interface LogoProps {
  onClick?: () => void;
}

export default function Logo({onClick}: LogoProps) {
  const content = (
    <div className="rounded-full bg-white px-6 py-2.5 shadow-sm">
      <h1
        className="text-3xl font-black tracking-tight text-[rgb(20,30,50)]"
        style={{fontFamily: "'Inter', sans-serif"}}
      >
        slides2gif
      </h1>
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="inline-block cursor-pointer">
        {content}
      </button>
    );
  }

  return (
    <a href="/" className="inline-block">
      {content}
    </a>
  );
}
