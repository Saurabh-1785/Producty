'use client';

import React from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Auth disabled for hackathon demo — all pages accessible without login
  return <>{children}</>;
}
