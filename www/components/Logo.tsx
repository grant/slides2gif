import React from 'react';

export default function Logo() {
  return (
    <a href="/" className="inline-block">
      <div className="rounded-full bg-white px-6 py-2.5 shadow-sm">
        <h1
          className="text-3xl font-black tracking-tight text-[rgb(20,30,50)]"
          style={{fontFamily: "'Inter', sans-serif"}}
        >
          slides2gif
        </h1>
      </div>
    </a>
  );
}
